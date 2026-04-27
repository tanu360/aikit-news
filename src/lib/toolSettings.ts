export const CHAT_TOOL_KEYS = [
  "search",
  "weather",
] as const;

export type ChatToolKey = (typeof CHAT_TOOL_KEYS)[number];

export interface ChatToolSettings {
  search: boolean;
  weather: boolean;
}

export const DEFAULT_CHAT_TOOL_SETTINGS: ChatToolSettings = {
  search: false,
  weather: false,
};

const TOOL_LABELS: Record<ChatToolKey, string> = {
  search: "Search",
  weather: "Weather",
};

export function normalizeChatToolSettings(value: unknown): ChatToolSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_CHAT_TOOL_SETTINGS };
  }

  const raw = value as Partial<Record<ChatToolKey, unknown>>;
  return CHAT_TOOL_KEYS.reduce<ChatToolSettings>(
    (settings, key) => ({
      ...settings,
      [key]: raw[key] === true,
    }),
    { ...DEFAULT_CHAT_TOOL_SETTINGS }
  );
}

export function enabledToolLabels(settings: ChatToolSettings): string {
  const labels = CHAT_TOOL_KEYS.filter((key) => settings[key]).map(
    (key) => TOOL_LABELS[key]
  );
  return labels.length > 0 ? labels.join(", ") : "none";
}
