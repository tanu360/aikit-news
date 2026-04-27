import { NextRequest } from "next/server";
import { ChatJimmyError, chatJimmy, chatJimmyWithTools } from "@/lib/jimmy";
import type { ChatJimmyTool } from "@/lib/jimmy";
import {
  appendUserSystemPrompt,
  buildAnswerSystemPrompt,
  buildRouterSystemPrompt,
  todayISODate,
} from "@/lib/prompts";
import type { WeatherCardData } from "@/lib/types";
import type { ChatToolSettings } from "@/lib/toolSettings";
import { normalizeChatToolSettings } from "@/lib/toolSettings";
import { getWeather } from "@/lib/weather";

const WEATHER_TOOL: ChatJimmyTool = {
  type: "function",
  function: {
    name: "get_weather",
    description:
      "Get current weather and the next few hours of forecast for an explicit city, region, or place from the user's request. Never use this for 'near me' or an assumed location.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description:
            "City, region, or place name, resolved from the user's request.",
        },
        units: {
          type: "string",
          enum: ["metric"],
          description: "Always use metric units so the weather card shows Celsius.",
        },
      },
      required: ["location"],
    },
  },
};

function stripTrailingReferences(text: string): string {
  return text
    .replace(
      /\n+\*?\*?(?:References|Sources|Bibliography|Key findings|Citations|Note)\*?\*?:?\s*\n(?:\s*[-*]?\s*\[?\d+\]?[^\n]*\n?)*/gi,
      ""
    )
    .replace(/\[(\d+)(?:\s*,\s*(\d+))+\]/g, (match: string) => {
      const nums = match.match(/\d+/g) || [];
      return nums.map((n: string) => `[${n}]`).join("");
    })
    .trimEnd();
}

interface RequestBody {
  messages: Array<{ role: string; content: string }>;
  searchResults?: Array<{
    title?: string;
    url?: string;
    text?: string;
    highlights?: string[];
  }>;
  mode?: "router" | "answer";
  topK?: number;
  systemPrompt?: string;
  toolSettings?: Partial<ChatToolSettings>;
}

function sseData(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function streamChatResponse({
  content,
  weatherCard,
  serverTiming,
  status = 200,
}: {
  content: string;
  weatherCard?: WeatherCardData | null;
  serverTiming: string;
  status?: number;
}) {
  const encoder = new TextEncoder();
  const chunkSize = 12;
  const stream = new ReadableStream({
    start(controller) {
      if (weatherCard) {
        controller.enqueue(
          encoder.encode(
            sseData({
              type: "weather",
              weather: weatherCard,
            })
          )
        );
      }

      for (let i = 0; i < content.length; i += chunkSize) {
        const chunk = content.slice(i, i + chunkSize);
        controller.enqueue(
          encoder.encode(
            sseData({
              choices: [{ delta: { content: chunk } }],
            })
          )
        );
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Server-Timing": serverTiming,
      "x-debug-timing": serverTiming,
      "Access-Control-Expose-Headers": "Server-Timing, x-debug-timing",
    },
  });
}

function getStringArg(
  args: Record<string, unknown>,
  key: string
): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stripFileBlocks(content: string): string {
  return content.replace(/<file\b[^>]*>[\s\S]*?<\/file>/gi, "").trim();
}

function latestUserText(messages: RequestBody["messages"]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role === "user") return stripFileBlocks(message.content);
  }
  return "";
}

function shouldEnableWeatherTool(messages: RequestBody["messages"]): boolean {
  const text = latestUserText(messages).toLowerCase();
  if (!text) return false;
  const asksAboutDocument =
    /\b(file|document|attachment|attached|uploaded|content|text|snippet)\b/.test(
      text
    );
  const explicitWeather =
    /\b(weather|forecast|humidity|wind|rain|snow|sunrise|sunset)\b/.test(text) ||
    /\b(current|now|today|tonight|tomorrow|live|outside)\b.{0,48}\b(temp|temperature|high|low)\b/.test(
      text
    ) ||
    /\b(temp|temperature|high|low)\b.{0,48}\b(current|now|today|tonight|tomorrow|live|outside)\b/.test(
      text
    );
  return explicitWeather && !asksAboutDocument;
}

function formatWeatherAnswer(weather: WeatherCardData): string {
  const temp = `${weather.temperature}${weather.temperatureUnit}`;
  const feelsLike =
    typeof weather.apparentTemperature === "number"
      ? `, feels like ${weather.apparentTemperature}${weather.temperatureUnit}`
      : "";
  const hiLo =
    typeof weather.high === "number" && typeof weather.low === "number"
      ? ` Today's high is ${weather.high}${weather.temperatureUnit} and the low is ${weather.low}${weather.temperatureUnit}.`
      : "";
  const details = [
    typeof weather.humidity === "number" ? `humidity is ${weather.humidity}%` : "",
    typeof weather.windSpeed === "number"
      ? `wind is ${weather.windSpeed} ${weather.windUnit}`
      : "",
  ].filter(Boolean);
  const detailText =
    details.length > 0 ? ` ${details.join(" and ")}.` : "";

  return `The current temperature in ${weather.location} is about ${temp}${feelsLike}, with ${weather.condition.toLowerCase()}.${hiLo}${detailText}`;
}

export async function POST(req: NextRequest) {
  const tEntry = Date.now();
  const body = (await req.json()) as RequestBody;
  const tParsed = Date.now();

  const {
    messages = [],
    searchResults = [],
    mode,
    topK,
    systemPrompt,
  } = body;
  const toolSettings = normalizeChatToolSettings(body.toolSettings);
  const jimmyOpts = {
    ...(topK != null ? { topK } : {}),
  };
  const effectiveMode: "router" | "answer" =
    mode === "router" ? "router" : "answer";

  const today = todayISODate();
  const baseSystemContent =
    effectiveMode === "router"
      ? buildRouterSystemPrompt(today, toolSettings)
      : buildAnswerSystemPrompt(searchResults, today, toolSettings);
  const systemContent = appendUserSystemPrompt(baseSystemContent, systemPrompt);

  const tPromptBuilt = Date.now();

  try {
    let weatherCard: WeatherCardData | null = null;
    let weatherDuration = 0;
    let content = "";
    let tChatjimmyDone = 0;

    if (effectiveMode === "router") {
      const weatherTools: ChatJimmyTool[] =
        toolSettings.weather && shouldEnableWeatherTool(messages)
        ? [WEATHER_TOOL]
        : [];
      const completion = await chatJimmyWithTools(
        [{ role: "system", content: systemContent }, ...messages],
        weatherTools,
        jimmyOpts
      );
      tChatjimmyDone = Date.now();
      const weatherCall = completion.toolCalls.find(
        (toolCall) => toolCall.name === "get_weather"
      );

      if (weatherCall) {
        const location = getStringArg(weatherCall.arguments, "location");
        const units = getStringArg(weatherCall.arguments, "units");

        if (!location) {
          content = "Which city or place should I check the weather for?";
        } else {
          const tWeatherStart = Date.now();
          weatherCard = await getWeather(location, units);
          weatherDuration = Date.now() - tWeatherStart;
          content = formatWeatherAnswer(weatherCard);
        }
      } else {
        content = completion.content;
      }
    } else {
      content = await chatJimmy([
        { role: "system", content: systemContent },
        ...messages,
      ], jimmyOpts);
      tChatjimmyDone = Date.now();
    }

    if (effectiveMode === "answer") {
      content = stripTrailingReferences(content);
    }
    const tStripped = Date.now();

    const serverTiming = [
      `mode;desc="${effectiveMode}"`,
      `req_parse;dur=${tParsed - tEntry}`,
      `build_prompt;dur=${tPromptBuilt - tParsed}`,
      `chatjimmy;dur=${tChatjimmyDone - tPromptBuilt}`,
      `weather;dur=${weatherDuration}`,
      `strip;dur=${tStripped - tChatjimmyDone}`,
      `total;dur=${tStripped - tEntry}`,
    ].join(", ");

    return streamChatResponse({
      content,
      weatherCard,
      serverTiming,
    });
  } catch (error) {
    if (error instanceof ChatJimmyError && error.retryable) {
      const tError = Date.now();
      const serverTiming = [
        `mode;desc="${effectiveMode}"`,
        `req_parse;dur=${tParsed - tEntry}`,
        `build_prompt;dur=${tPromptBuilt - tParsed}`,
        `chatjimmy;dur=${tError - tPromptBuilt}`,
        `weather;dur=0`,
        `strip;dur=0`,
        `total;dur=${tError - tEntry}`,
      ].join(", ");

      console.warn("ChatJimmy busy:", {
        status: error.status,
        upstreamStatus: error.upstreamStatus,
      });

      return streamChatResponse({
        content: error.message,
        serverTiming,
      });
    }

    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to connect to chat API" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
