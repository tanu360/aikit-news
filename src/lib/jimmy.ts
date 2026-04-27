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

export interface ChatJimmyOptions {
  topK?: number;
  systemPrompt?: string;
}

export class ChatJimmyError extends Error {
  status: number;
  upstreamStatus?: number;
  responseBody: string;
  retryable: boolean;

  constructor({
    message,
    status,
    upstreamStatus,
    responseBody,
    retryable,
  }: {
    message: string;
    status: number;
    upstreamStatus?: number;
    responseBody: string;
    retryable: boolean;
  }) {
    super(message);
    this.name = "ChatJimmyError";
    this.status = status;
    this.upstreamStatus = upstreamStatus;
    this.responseBody = responseBody;
    this.retryable = retryable;
  }
}

function parseChatJimmyErrorMessage(errorText: string): string {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { message?: unknown };
    };
    return typeof parsed.error?.message === "string"
      ? parsed.error.message
      : errorText;
  } catch {
    return errorText;
  }
}

function parseUpstreamStatus(message: string): number | undefined {
  const match = message.match(/upstream error\s+(\d+)/i);
  if (!match?.[1]) return undefined;
  const status = Number(match[1]);
  return Number.isFinite(status) ? status : undefined;
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
  tools?: ChatJimmyTool[],
  options?: ChatJimmyOptions
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
      ...(options?.topK != null ? { top_k: options.topK } : {}),
      ...(options?.systemPrompt ? { chatOptions: { systemPrompt: options.systemPrompt } } : {}),
      ...(tools && tools.length > 0 ? { tools, tool_choice: "auto" } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const upstreamMessage = parseChatJimmyErrorMessage(errorText);
    const upstreamStatus = parseUpstreamStatus(upstreamMessage);
    const effectiveStatus = upstreamStatus ?? response.status;
    const retryable =
      effectiveStatus === 429 ||
      /too many requests|server is busy/i.test(upstreamMessage);
    const message = retryable
      ? "ChatJimmy is busy right now. Please try again in a moment."
      : `ChatJimmy error ${response.status}: ${upstreamMessage}`;

    throw new ChatJimmyError({
      message,
      status: response.status,
      upstreamStatus,
      responseBody: errorText,
      retryable,
    });
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
  tools: ChatJimmyTool[],
  options?: ChatJimmyOptions
): Promise<ChatJimmyCompletion> {
  return requestChatJimmy(messages, tools, options);
}

export async function chatJimmy(
  messages: ChatJimmyMessage[],
  options?: ChatJimmyOptions
): Promise<string> {
  const completion = await requestChatJimmy(messages, undefined, options);
  return completion.content;
}
