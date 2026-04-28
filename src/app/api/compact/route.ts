import { NextRequest } from "next/server";
import { ChatJimmyError, chatJimmyCompletion } from "@/lib/jimmy";
import type { ChatJimmyMessageContent } from "@/lib/jimmy";
import {
  COMPACTED_CONTEXT_TOKEN_LIMIT,
  MODEL_CONTEXT_TOKEN_LIMIT,
  getSiteTokenCount,
  truncateToTokenLimit,
} from "@/lib/tokenCount";

interface CompactMessage {
  role: string;
  content: ChatJimmyMessageContent;
}

interface RequestBody {
  previousSummary?: string;
  messages?: CompactMessage[];
  maxSummaryTokens?: number;
}

function safeRole(role: string): string {
  if (role === "assistant") return "Assistant";
  if (role === "system") return "System";
  return "User";
}

function stringifyContent(content: ChatJimmyMessageContent): string {
  if (typeof content === "string") return content.trim();

  return content
    .map((part) => {
      if (part.type === "text") return part.text.trim();
      const size = typeof part.size === "number" ? `${part.size} bytes` : "unknown size";
      return [
        `[Attached file: ${part.name}, ${size}]`,
        part.content.trim(),
      ]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function renderMessage(message: CompactMessage, index: number): string {
  const content = stringifyContent(message.content);
  return [
    `### ${index + 1}. ${safeRole(message.role)}`,
    content || "[empty message]",
  ].join("\n");
}

function buildTranscript(messages: CompactMessage[], tokenBudget: number): string {
  const rendered = messages.map(renderMessage);
  const selected: string[] = [];
  let usedTokens = 0;
  let firstIncludedIndex = rendered.length;

  for (let index = rendered.length - 1; index >= 0; index--) {
    const messageText = rendered[index] ?? "";
    const messageTokens = getSiteTokenCount(messageText);
    if (selected.length > 0 && usedTokens + messageTokens > tokenBudget) {
      break;
    }

    if (selected.length === 0 && messageTokens > tokenBudget) {
      selected.unshift(truncateToTokenLimit(messageText, tokenBudget));
      firstIncludedIndex = index;
      break;
    }

    selected.unshift(messageText);
    usedTokens += messageTokens;
    firstIncludedIndex = index;
  }

  if (firstIncludedIndex > 0) {
    selected.unshift(
      `[${firstIncludedIndex} earlier messages were omitted from this compaction pass because the transcript was too large.]`
    );
  }

  return selected.join("\n\n").trim();
}

function enforceSummaryBudget(summary: string, maxTokens: number): string {
  const cleanSummary = summary.trim();
  if (getSiteTokenCount(cleanSummary) <= maxTokens) return cleanSummary;

  const suffix = "\n\n[Trimmed to fit compact memory budget.]";
  const suffixTokens = getSiteTokenCount(suffix);
  return `${truncateToTokenLimit(
    cleanSummary,
    Math.max(1, maxTokens - suffixTokens)
  )}${suffix}`.trim();
}

function buildFallbackSummary({
  previousSummary,
  transcript,
  maxTokens,
}: {
  previousSummary: string;
  transcript: string;
  maxTokens: number;
}): string {
  const sections = [
    previousSummary
      ? `Previous compact memory:\n${previousSummary}`
      : "",
    transcript
      ? `Recent visible chat to remember:\n${transcript}`
      : "",
  ].filter(Boolean);

  return enforceSummaryBudget(
    sections.join("\n\n") || "No durable conversation details yet.",
    maxTokens
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as RequestBody;
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const maxSummaryTokens = Math.min(
    COMPACTED_CONTEXT_TOKEN_LIMIT,
    Math.max(128, Math.round(body.maxSummaryTokens ?? COMPACTED_CONTEXT_TOKEN_LIMIT))
  );
  const previousSummary =
    typeof body.previousSummary === "string" ? body.previousSummary.trim() : "";

  if (!messages.length && !previousSummary) {
    return Response.json(
      { error: "Nothing to compact." },
      { status: 400 }
    );
  }

  const previousSummaryBudget = maxSummaryTokens;
  const compactPreviousSummary = previousSummary
    ? truncateToTokenLimit(previousSummary, previousSummaryBudget)
    : "";
  const transcriptBudget =
    MODEL_CONTEXT_TOKEN_LIMIT -
    getSiteTokenCount(compactPreviousSummary) -
    640;
  const transcript = buildTranscript(messages, Math.max(1024, transcriptBudget));

  const systemPrompt = [
    "You maintain compact memory for an ongoing AI chat.",
    `Return only a concise Markdown memory summary under ${maxSummaryTokens} tokens.`,
    "Preserve user goals, preferences, decisions, constraints, names, files, URLs, code paths, bugs, pending tasks, and the latest state needed for the next reply.",
    "Merge the previous compact memory with the new transcript. Remove repetition, greetings, filler, and outdated details.",
    "Do not mention that messages were deleted. Do not add prefaces. Do not invent facts.",
  ].join(" ");

  const userPrompt = [
    compactPreviousSummary
      ? `Previous compact memory:\n${compactPreviousSummary}`
      : "Previous compact memory:\n[none]",
    `New transcript to fold into memory:\n${transcript || "[none]"}`,
  ].join("\n\n");

  try {
    const completion = await chatJimmyCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const summary = enforceSummaryBudget(
      completion.content,
      maxSummaryTokens
    );
    if (!summary.trim()) {
      const fallbackSummary = buildFallbackSummary({
        previousSummary: compactPreviousSummary,
        transcript,
        maxTokens: maxSummaryTokens,
      });

      return Response.json({
        summary: fallbackSummary,
        tokenCount: getSiteTokenCount(fallbackSummary),
        sourceMessageCount: messages.length,
        fallback: true,
      });
    }

    return Response.json({
      summary,
      tokenCount: getSiteTokenCount(summary),
      sourceMessageCount: messages.length,
    });
  } catch (error) {
    const fallbackSummary = buildFallbackSummary({
      previousSummary: compactPreviousSummary,
      transcript,
      maxTokens: maxSummaryTokens,
    });

    console.warn("Context compaction fell back to local summary:", {
      reason:
        error instanceof ChatJimmyError || error instanceof Error
          ? error.message
          : "unknown",
    });

    return Response.json({
      summary: fallbackSummary,
      tokenCount: getSiteTokenCount(fallbackSummary),
      sourceMessageCount: messages.length,
      fallback: true,
    });
  }
}
