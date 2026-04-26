const CHATJIMMY_API_URL = process.env.CHATJIMMY_API_URL;
const CHATJIMMY_API_KEY = process.env.CHATJIMMY_API_KEY;
const CHATJIMMY_MODEL = process.env.CHATJIMMY_MODEL;
const MAX_SYSTEM_PROMPT_CHARS = 16384;
const SOURCES_MARKER = "\nSources:\n";

type ChatJimmyMessage = { role: string; content: string };

export interface ChatJimmyTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ChatJimmyToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatJimmyCompletion {
  content: string;
  toolCalls: ChatJimmyToolCall[];
  finishReason?: string;
}

function compactSystemPrompt(text: string): string {
  if (text.length <= MAX_SYSTEM_PROMPT_CHARS) {
    return text;
  }

  const markerIndex = text.indexOf(SOURCES_MARKER);
  if (markerIndex === -1) {
    return text.slice(0, MAX_SYSTEM_PROMPT_CHARS).trimEnd();
  }

  const prefix = text.slice(0, markerIndex + SOURCES_MARKER.length);
  const sources = text.slice(markerIndex + SOURCES_MARKER.length);
  const omission = "\n\n[Additional sources omitted to fit context.]";
  const budget = MAX_SYSTEM_PROMPT_CHARS - omission.length;

  if (prefix.length >= budget) {
    return text.slice(0, MAX_SYSTEM_PROMPT_CHARS).trimEnd();
  }

  let compacted = prefix;
  for (const source of sources.split(/\n(?=\[\d+\]\s)/g)) {
    const next = `${compacted}${source.trim()}\n\n`;
    if (next.length > budget) break;
    compacted = next;
  }

  return `${compacted.trimEnd()}${omission}`.trimEnd();
}

function prepareMessages(messages: ChatJimmyMessage[]): ChatJimmyMessage[] {
  const systemPrompt = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n")
    .trim();

  const chatMessages = messages.filter((message) => message.role !== "system");

  if (!systemPrompt) {
    return chatMessages;
  }

  return [
    {
      role: "system",
      content: compactSystemPrompt(systemPrompt),
    },
    ...chatMessages,
  ];
}

function parseToolArguments(value: unknown): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

async function requestChatJimmy(
  messages: ChatJimmyMessage[],
  tools?: ChatJimmyTool[]
): Promise<ChatJimmyCompletion> {
  if (!CHATJIMMY_API_URL || !CHATJIMMY_API_KEY || !CHATJIMMY_MODEL) {
    throw new Error(
      "Missing ChatJimmy env vars: CHATJIMMY_API_URL, CHATJIMMY_API_KEY, CHATJIMMY_MODEL"
    );
  }

  const preparedMessages = prepareMessages(messages);

  const response = await fetch(CHATJIMMY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CHATJIMMY_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: CHATJIMMY_MODEL,
      messages: preparedMessages,
      stream: false,
      ...(tools && tools.length > 0
        ? { tools, tool_choice: "auto" }
        : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ChatJimmy error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const choice = data?.choices?.[0];
  const message = choice?.message || {};
  const content = typeof message.content === "string" ? message.content : "";
  const toolCalls = Array.isArray(message.tool_calls)
    ? message.tool_calls
        .map((toolCall: Record<string, unknown>, index: number) => {
          const fn = toolCall.function as
            | { name?: string; arguments?: unknown }
            | undefined;
          const name =
            typeof fn?.name === "string"
              ? fn.name
              : typeof toolCall.name === "string"
                ? toolCall.name
                : "";

          if (!name) return null;

          return {
            id:
              typeof toolCall.id === "string"
                ? toolCall.id
                : `tool-${index}`,
            name,
            arguments: parseToolArguments(fn?.arguments ?? toolCall.arguments),
          };
        })
        .filter((toolCall: ChatJimmyToolCall | null): toolCall is ChatJimmyToolCall =>
          Boolean(toolCall)
        )
    : [];

  if (!content && toolCalls.length === 0) {
    throw new Error("ChatJimmy returned an empty response");
  }

  return {
    content: content.trim(),
    toolCalls,
    finishReason:
      typeof choice?.finish_reason === "string"
        ? choice.finish_reason
        : undefined,
  };
}

export async function chatJimmyWithTools(
  messages: ChatJimmyMessage[],
  tools: ChatJimmyTool[]
): Promise<ChatJimmyCompletion> {
  return requestChatJimmy(messages, tools);
}

export async function chatJimmy(
  messages: ChatJimmyMessage[]
): Promise<string> {
  const completion = await requestChatJimmy(messages);
  return completion.content;
}
