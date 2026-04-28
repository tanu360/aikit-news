import { decode, encode } from "gpt-tokenizer/encoding/cl100k_base";

export const MODEL_CONTEXT_TOKEN_LIMIT = 6144;
export const AUTO_COMPACT_TRIGGER_TOKEN_LIMIT = 5376;
export const COMPACTED_CONTEXT_TOKEN_LIMIT = 768;
export const FILE_TOKEN_LIMIT = Math.floor(MODEL_CONTEXT_TOKEN_LIMIT * (2 / 3));

export function getSiteTokenCount(text: string): number {
  if (!text) return 0;
  return encode(` ${text}`).length;
}

export function formatTokenCount(tokenCount: number): string {
  return `${tokenCount.toLocaleString()} tokens`;
}

export function getAttachmentTokenCount(file: {
  content: string;
  tokenCount?: number;
}): number {
  return typeof file.tokenCount === "number"
    ? file.tokenCount
    : getSiteTokenCount(file.content);
}

export function truncateToTokenLimit(text: string, tokenLimit: number): string {
  if (!text || tokenLimit <= 0) return "";
  const tokens = encode(` ${text}`);
  if (tokens.length <= tokenLimit) return text;
  return decode(tokens.slice(0, tokenLimit)).trim();
}
