import { NextRequest } from "next/server";
import {
  ChatJimmyError,
  chatJimmyCompletion,
  chatJimmyWithTools,
} from "@/lib/jimmy";
import type {
  ChatJimmyAttachment,
  ChatJimmyMessageContent,
  ChatJimmyTool,
} from "@/lib/jimmy";
import type { GenerationStats, PriceCardData } from "@/lib/types";
import { readJsonRecord } from "@/lib/api";
import {
  appendUserSystemPrompt,
  buildAnswerSystemPrompt,
  buildRouterSystemPrompt,
  normalizePromptDate,
} from "@/lib/prompts";
import type { SourceStatus } from "@/lib/prompts";
import type { WeatherCardData } from "@/lib/types";
import type { ChatToolSettings } from "@/lib/toolSettings";
import { normalizeChatToolSettings } from "@/lib/toolSettings";
import { getWeather } from "@/lib/weather";
import { BinanceSymbolError, getBinancePrice } from "@/lib/binance";

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

const PRICE_TOOL: ChatJimmyTool = {
  type: "function",
  function: {
    name: "get_binance_price",
    description:
      "Get live Binance Spot 24h ticker data for an explicit crypto coin or trading pair from the user's request. Single assets default to USDT.",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description:
            "Coin ticker, coin name, or Binance Spot pair from the user's request. Examples: BTC, bitcoin, BTCUSDT, ETHBTC.",
        },
      },
      required: ["symbol"],
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

function stripLeadingSearchControl(text: string): string {
  return text
    .replace(/^\s*(?:[-*>`*]\s*)?search\s*:\s*[^\r\n]*(?:\r?\n)*/i, "")
    .trimStart();
}

interface RequestBody {
  messages: Array<{ role: string; content: ChatJimmyMessageContent }>;
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
  attachment?: ChatJimmyAttachment;
  clientDate?: string;
  searchAttempted?: boolean;
  searchError?: string;
}

function isContentPart(value: unknown): value is Exclude<ChatJimmyMessageContent, string>[number] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const part = value as Record<string, unknown>;
  if (part.type === "text") return typeof part.text === "string";
  return (
    part.type === "file" &&
    typeof part.name === "string" &&
    typeof part.content === "string" &&
    (part.size === undefined || typeof part.size === "number")
  );
}

function isMessageContent(value: unknown): value is ChatJimmyMessageContent {
  return (
    typeof value === "string" ||
    (Array.isArray(value) && value.every(isContentPart))
  );
}

function isRequestMessage(
  value: unknown
): value is RequestBody["messages"][number] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  return typeof message.role === "string" && isMessageContent(message.content);
}

function isSearchResultInput(
  value: unknown
): value is NonNullable<RequestBody["searchResults"]>[number] {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readFiniteOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readAttachment(value: unknown): ChatJimmyAttachment | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const attachment = value as Record<string, unknown>;
  if (
    typeof attachment.name !== "string" ||
    typeof attachment.content !== "string"
  ) {
    return undefined;
  }

  return {
    name: attachment.name,
    content: attachment.content,
    size: readFiniteOptionalNumber(attachment.size),
  };
}

function sseData(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function streamChatResponse({
  content,
  generationStats,
  weatherCard,
  priceCard,
  serverTiming,
  status = 200,
}: {
  content: string;
  generationStats?: GenerationStats;
  weatherCard?: WeatherCardData | null;
  priceCard?: PriceCardData | null;
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

      if (priceCard) {
        controller.enqueue(
          encoder.encode(
            sseData({
              type: "price",
              price: priceCard,
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
      if (generationStats) {
        controller.enqueue(
          encoder.encode(
            sseData({
              type: "generation_stats",
              stats: generationStats,
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

function streamControlResponse({
  event,
  serverTiming,
  status = 200,
}: {
  event: Record<string, unknown>;
  serverTiming: string;
  status?: number;
}) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseData(event)));
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

function messageText(content: ChatJimmyMessageContent): string {
  if (typeof content === "string") return stripFileBlocks(content);
  return content
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function latestUserText(messages: RequestBody["messages"]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role === "user") return messageText(message.content);
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
  const weatherTerm =
    /\b(?:weather|forecast|humidity|wind|rain|snow|sunrise|sunset)\b/i.test(
      text
    );
  const explicitWeather =
    weatherTerm ||
    /\b(temp|temperature)\b/.test(text) ||
    /\b(current|now|today|tonight|tomorrow|live|outside)\b.{0,48}\b(temp|temperature|high|low)\b/.test(
      text
    ) ||
    /\b(temp|temperature|high|low)\b.{0,48}\b(current|now|today|tonight|tomorrow|live|outside)\b/.test(
      text
    );
  return explicitWeather && !asksAboutDocument;
}

function shouldEnablePriceTool(messages: RequestBody["messages"]): boolean {
  const text = latestUserText(messages).toLowerCase();
  if (!text) return false;
  const asksAboutDocument =
    /\b(file|document|attachment|attached|uploaded|content|text|snippet)\b/.test(
      text
    );
  if (asksAboutDocument) return false;

  const quoteAssets = "usdt|fdusd|usdc|tusd|busd|btc|eth|bnb|try|eur|brl|dai";
  const separatedPairPattern = new RegExp(
    `\\b[a-z0-9]{2,12}\\s*(?:/|-|:)\\s*(?:${quoteAssets})\\b`,
    "i"
  );
  const compactPairPattern = new RegExp(
    `\\b[a-z0-9]{2,12}(?:${quoteAssets})\\b`,
    "i"
  );
  const priceIntent =
    /\b(?:price|ticker|quote|rate|24h|high|low|bid|ask|volume|open|close|change)\b/i.test(
      text
    );
  const cryptoAsset =
    /\b(?:btc|bitcoin|eth|ethereum|bnb|sol|solana|xrp|ada|doge|dogecoin|ltc|litecoin|trx|link|avax|shib|ton|crypto)\b/i.test(
      text
    );
  const nonPriceTopic =
    /\b(?:news|roadmap|explain|explainer|what\s+is|who\s+is|history|whitepaper|project|technology|guide|how\s+to|analysis)\b/i.test(
      text
    );
  const hasExplicitPair =
    separatedPairPattern.test(text) || compactPairPattern.test(text);

  if (priceIntent && (cryptoAsset || hasExplicitPair)) return true;

  return hasExplicitPair && !nonPriceTopic;
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

function formatPriceAnswer(price: PriceCardData): string {
  const direction =
    price.priceChangePercent > 0
      ? "up"
      : price.priceChangePercent < 0
        ? "down"
        : "flat";
  return `${price.symbol} is ${price.priceText} ${price.quoteAsset} on Binance Spot, ${direction} ${price.priceChangePercentText} over 24h. The 24h range is ${price.lowPriceText}-${price.highPriceText} ${price.quoteAsset}.`;
}

function isEmptyChatJimmyResponse(error: unknown): boolean {
  return error instanceof Error && /empty response/i.test(error.message);
}

export async function POST(req: NextRequest) {
  const tEntry = Date.now();
  const parsed = await readJsonRecord(req);
  if (parsed.errorResponse) return parsed.errorResponse;
  const body = parsed.body;
  const tParsed = Date.now();

  const messages = Array.isArray(body.messages)
    ? body.messages.filter(isRequestMessage)
    : [];
  const searchResults = Array.isArray(body.searchResults)
    ? body.searchResults.filter(isSearchResultInput)
    : [];
  const mode = body.mode === "router" || body.mode === "answer"
    ? body.mode
    : undefined;
  const topK = readFiniteOptionalNumber(body.topK);
  const systemPrompt =
    typeof body.systemPrompt === "string" ? body.systemPrompt : undefined;
  const attachment = readAttachment(body.attachment);
  const clientDate =
    typeof body.clientDate === "string" ? body.clientDate : undefined;
  const searchAttempted = body.searchAttempted === true;
  const searchError =
    typeof body.searchError === "string" ? body.searchError : undefined;
  const toolSettings = normalizeChatToolSettings(body.toolSettings);
  const jimmyOpts = {
    ...(topK != null ? { topK } : {}),
    ...(attachment ? { attachment } : {}),
  };
  const effectiveMode: "router" | "answer" =
    mode === "router" ? "router" : "answer";

  const today = normalizePromptDate(clientDate);
  const sourceStatus: SourceStatus =
    searchResults.length > 0
      ? "available"
      : searchError
        ? "error"
        : searchAttempted
          ? "empty"
          : "not_requested";
  const shouldBuildToolPrompt =
    effectiveMode === "router" &&
    (toolSettings.search || toolSettings.weather || toolSettings.price);
  const shouldBuildSourcePrompt =
    effectiveMode === "answer" &&
    (toolSettings.search ||
      toolSettings.weather ||
      toolSettings.price ||
      searchResults.length > 0 ||
      !!searchAttempted ||
      !!searchError);
  const baseSystemContent = shouldBuildToolPrompt
    ? buildRouterSystemPrompt(today, toolSettings)
    : shouldBuildSourcePrompt
      ? buildAnswerSystemPrompt(searchResults, today, toolSettings, {
        sourceStatus,
        searchError,
      })
      : "";
  const systemContent = appendUserSystemPrompt(baseSystemContent, systemPrompt);
  const jimmyMessages = systemContent
    ? [{ role: "system", content: systemContent }, ...messages]
    : messages;

  const tPromptBuilt = Date.now();

  try {
    let weatherCard: WeatherCardData | null = null;
    let weatherDuration = 0;
    let priceCard: PriceCardData | null = null;
    let priceDuration = 0;
    let content = "";
    let generationStats: GenerationStats | undefined;
    let tChatjimmyDone = 0;

    if (effectiveMode === "router") {
      if (!toolSettings.price && shouldEnablePriceTool(messages)) {
        tChatjimmyDone = Date.now();
        content =
          "Price is disabled. Enable Price in Tools settings to fetch live Binance Spot prices.";
      } else {
        const routerTools: ChatJimmyTool[] = [
          ...(toolSettings.weather && shouldEnableWeatherTool(messages)
            ? [WEATHER_TOOL]
            : []),
          ...(toolSettings.price && shouldEnablePriceTool(messages)
            ? [PRICE_TOOL]
            : []),
        ];
        const completion = await chatJimmyWithTools(
          jimmyMessages,
          routerTools,
          jimmyOpts
        );
        tChatjimmyDone = Date.now();
        const weatherCall = completion.toolCalls.find(
          (toolCall) => toolCall.name === "get_weather"
        );
        const priceCall = completion.toolCalls.find(
          (toolCall) => toolCall.name === "get_binance_price"
        );

        if (weatherCall) {
          generationStats = completion.generationStats;
          const location = getStringArg(weatherCall.arguments, "location");
          const units = getStringArg(weatherCall.arguments, "units");

          if (!location) {
            content = "Which city or place should I check the weather for?";
          } else {
            try {
              const tWeatherStart = Date.now();
              weatherCard = await getWeather(location, units);
              weatherDuration = Date.now() - tWeatherStart;
              content = formatWeatherAnswer(weatherCard);
            } catch {
              const fallbackCompletion = await chatJimmyCompletion(
                jimmyMessages,
                jimmyOpts
              );
              content = fallbackCompletion.content;
              generationStats = fallbackCompletion.generationStats;
              tChatjimmyDone = Date.now();
            }
          }
        } else if (priceCall) {
          generationStats = completion.generationStats;
          const symbol = getStringArg(priceCall.arguments, "symbol");

          if (!symbol) {
            content = "Which coin or Binance Spot pair should I check?";
          } else {
            try {
              const tPriceStart = Date.now();
              priceCard = await getBinancePrice(symbol);
              priceDuration = Date.now() - tPriceStart;
              content = formatPriceAnswer(priceCard);
            } catch (error) {
              if (error instanceof BinanceSymbolError) {
                content = error.message;
              } else {
                const fallbackCompletion = await chatJimmyCompletion(
                  jimmyMessages,
                  jimmyOpts
                );
                content = fallbackCompletion.content;
                generationStats = fallbackCompletion.generationStats;
                tChatjimmyDone = Date.now();
              }
            }
          }
        } else {
          content = completion.content;
          generationStats = completion.generationStats;
        }
      }
    } else {
      const completion = await chatJimmyCompletion(jimmyMessages, jimmyOpts);
      content = completion.content;
      generationStats = completion.generationStats;
      tChatjimmyDone = Date.now();
    }

    if (effectiveMode === "answer") {
      content = stripTrailingReferences(stripLeadingSearchControl(content));
      if (!content.trim()) {
        content =
          "I found search results, but couldn't turn them into a final answer. Please try the search again.";
      }
    }
    const tStripped = Date.now();

    const serverTiming = [
      `mode;desc="${effectiveMode}"`,
      `req_parse;dur=${tParsed - tEntry}`,
      `build_prompt;dur=${tPromptBuilt - tParsed}`,
      `chatjimmy;dur=${tChatjimmyDone - tPromptBuilt}`,
      `weather;dur=${weatherDuration}`,
      `price;dur=${priceDuration}`,
      `strip;dur=${tStripped - tChatjimmyDone}`,
      `total;dur=${tStripped - tEntry}`,
    ].join(", ");

    return streamChatResponse({
      content,
      generationStats,
      weatherCard,
      priceCard,
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
        `price;dur=0`,
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
    if (isEmptyChatJimmyResponse(error)) {
      const tEmpty = Date.now();
      const serverTiming = [
        `mode;desc="${effectiveMode}"`,
        `req_parse;dur=${tParsed - tEntry}`,
        `build_prompt;dur=${tPromptBuilt - tParsed}`,
        `chatjimmy;dur=${tEmpty - tPromptBuilt}`,
        `weather;dur=0`,
        `price;dur=0`,
        `strip;dur=0`,
        `total;dur=${tEmpty - tEntry}`,
        `fallback;desc="compact_and_retry"`,
      ].join(", ");

      return streamControlResponse({
        event: {
          type: "context_compaction_required",
          reason: "empty_response",
          mode: effectiveMode,
        },
        serverTiming,
      });
    }

    return new Response(
      JSON.stringify({ error: "Failed to connect to chat API" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
