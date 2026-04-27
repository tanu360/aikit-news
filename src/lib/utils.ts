type ClassValue = string | number | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "";
  }
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function generateChatId(): string {
  return `aikit-${crypto.randomUUID()}`;
}

export function stripCitations(text: string): string {
  return text
    .replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, "")
    .replace(/ +/g, " ")
    .replace(/ ([.,;:!?])/g, "$1")
    .trim();
}

export function parseSSEStream(
  onChunk: (text: string) => void,
  onDone: () => void,
  onEvent?: (event: Record<string, unknown>) => void
) {
  let buffer = "";

  return {
    processChunk(chunk: string) {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed?.type && onEvent) {
            onEvent(parsed);
          }
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }
        } catch {}
      }
    },
  };
}
