import { encode } from "gpt-tokenizer/encoding/cl100k_base";

export const MODEL_CONTEXT_TOKEN_LIMIT = 6144;
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
