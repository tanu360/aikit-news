import { NextRequest } from "next/server";
import { chatJimmy } from "@/lib/jimmy";
import type { ChatJimmyAttachment, ChatJimmyOptions } from "@/lib/jimmy";

const EXA_API_KEY = process.env.EXA_API_KEY || "";

const MAX_DEPTH = 3;
const MAX_SOURCES_FOR_ANSWER = 18;
const EXA_DEEP_SEARCH_SYSTEM_PROMPT =
  "Prefer official, primary, recent, and non-duplicate sources. Return source text and highlights that directly support the research question.";

type ExaSearchResult = {
  title: string;
  url: string;
  text?: string;
  highlights?: string[];
  summary?: string;
};

async function searchExa(query: string) {
  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": EXA_API_KEY,
    },
    body: JSON.stringify({
      query,
      type: "deep",
      systemPrompt: EXA_DEEP_SEARCH_SYSTEM_PROMPT,
      numResults: 5,
      moderation: true,
      contents: {
        text: { maxCharacters: 1400 },
        highlights: {
          maxCharacters: 3000,
          query,
        },
        summary: {
          query: "Main findings relevant to the research question",
        },
        maxAgeHours: 24,
      },
    }),
  });

  if (!response.ok) {
    console.error("Exa search failed:", await response.text());
    return [];
  }

  const data = await response.json();
  return data.results || [];
}

async function synthesize(
  systemPrompt: string,
  userPrompt: string,
  options?: ChatJimmyOptions
): Promise<string> {
  return chatJimmy(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    options
  );
}

function parseFollowUps(
  text: string,
  maxFollowUps: number
): { synthesis: string; followUps: string[] } {
  const lines = text.split("\n");
  const synthesisLines: string[] = [];
  const followUps: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("FOLLOW_UP:")) {
      const question = trimmed.slice("FOLLOW_UP:".length).trim();
      if (question.length > 10) {
        followUps.push(question);
      }
    } else {
      synthesisLines.push(line);
    }
  }

  let synthesis = synthesisLines.join("\n").trim();
  synthesis = synthesis
    .replace(/^here(?:'s| is) (?:a |the )?\d*-?\d* ?sentence (?:brief )?synthesis[^:]*:\s*/i, "")
    .replace(/^here(?:'s| is) (?:a |the )?(?:brief )?synthesis[^:]*:\s*/i, "")
    .replace(/^\*\*synthesis:?\*\*\s*/i, "")
    .replace(/^\*\*synthesis\*\*\s*/i, "")
    .replace(/^synthesis:?\s*/i, "")
    .trim();

  return {
    synthesis,
    followUps: followUps.slice(0, maxFollowUps),
  };
}

function deduplicateSources(
  sources: ExaSearchResult[]
) {
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

function formatResultsForLLM(
  results: ExaSearchResult[],
  offset: number = 0
): string {
  return results
    .map((r, i) => {
      let entry = `[${offset + i + 1}] "${r.title}" (${r.url})`;
      if (r.summary) {
        entry += `\nSummary: ${r.summary.slice(0, 500)}`;
      }
      if (r.text) {
        entry += `\nContent: ${r.text.slice(0, 400)}`;
      }
      if (r.highlights && r.highlights.length > 0) {
        entry += `\nHighlights: ${r.highlights.join(" | ").slice(0, 700)}`;
      }
      return entry;
    })
    .join("\n\n");
}

function sseEvent(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, topK, systemPrompt, attachment } = body as {
    query: string;
    topK?: number;
    systemPrompt?: string;
    attachment?: ChatJimmyAttachment;
  };
  const jimmyOpts: ChatJimmyOptions = {
    ...(topK != null ? { topK } : {}),
    ...(systemPrompt?.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
    ...(attachment ? { attachment } : {}),
  };

  if (!query) {
    return new Response(JSON.stringify({ error: "Query required" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const allResults: ExaSearchResult[] = [];
      const allSyntheses: { query: string; synthesis: string }[] = [];
      let queuesToResearch: string[] = [query];

      try {
        for (
          let depth = 0;
          depth < MAX_DEPTH && queuesToResearch.length > 0;
          depth++
        ) {
          const currentQueries = [...queuesToResearch];
          queuesToResearch = [];

          const maxFollowUpsPerStep = depth === 0 ? 2 : 1;
          const isLastDepth = depth >= MAX_DEPTH - 1;

          for (const currentQuery of currentQueries) {
            const stepId = `step-${depth}-${Math.random().toString(36).slice(2, 8)}`;

            controller.enqueue(
              encoder.encode(
                sseEvent("step_start", {
                  stepId,
                  query: currentQuery,
                  depth,
                })
              )
            );

            const results = await searchExa(currentQuery);
            allResults.push(...results);

            controller.enqueue(
              encoder.encode(
                sseEvent("search_complete", {
                  stepId,
                  results: results.map(
                    (r: { title: string; url: string }) => ({
                      title: r.title,
                      url: r.url,
                    })
                  ),
                })
              )
            );

            const previousContext =
              allSyntheses.length > 0
                ? "Previous research found:\n" +
                allSyntheses
                  .map((s) => `- ${s.synthesis}`)
                  .join("\n") +
                "\n\n"
                : "";

            const systemPrompt = isLastDepth
              ? "You are AiKit research assistant. Write a 2-3 sentence synthesis of the new findings. Do NOT generate follow-up questions."
              : "You are AiKit research assistant. Given search results, do two things:\n" +
              "1. Write a 2-3 sentence synthesis of what was found.\n" +
              `2. List exactly ${maxFollowUpsPerStep} follow-up question${maxFollowUpsPerStep > 1 ? "s" : ""} to deepen understanding. Each MUST start on its own line with \"FOLLOW_UP:\" prefix.\n\n` +
              "Example:\nThe results show X is important for Y. Key findings suggest Z.\n\n" +
              "FOLLOW_UP: What mechanisms cause Y?\n" +
              (maxFollowUpsPerStep > 1
                ? "FOLLOW_UP: How does Z compare to alternatives?"
                : "");

            const userPrompt =
              previousContext +
              (depth > 0
                ? `Original query: ${query}\nNow researching: `
                : "Query: ") +
              currentQuery +
              "\n\nSearch results:\n" +
              formatResultsForLLM(results);

            controller.enqueue(
              encoder.encode(sseEvent("synthesizing", { stepId }))
            );

            const rawResponse = await synthesize(
              systemPrompt,
              userPrompt,
              jimmyOpts
            );
            const { synthesis, followUps } = parseFollowUps(
              rawResponse,
              maxFollowUpsPerStep
            );

            allSyntheses.push({ query: currentQuery, synthesis });

            controller.enqueue(
              encoder.encode(
                sseEvent("step_done", {
                  stepId,
                  synthesis,
                  followUps: isLastDepth ? [] : followUps,
                })
              )
            );

            if (!isLastDepth) {
              queuesToResearch.push(...followUps);
            }
          }
        }

        const uniqueSources = deduplicateSources(allResults);
        const sourcesForAnswer = uniqueSources.slice(
          0,
          MAX_SOURCES_FOR_ANSWER
        );

        controller.enqueue(
          encoder.encode(
            sseEvent("research_complete", {
              sources: uniqueSources.map((r) => ({
                title: r.title,
                url: r.url,
              })),
            })
          )
        );

        const researchContext = allSyntheses
          .map((s) => `- ${s.synthesis}`)
          .join("\n");

        const finalSystemPrompt =
          "You are AiKit, a helpful AI assistant. Write a well-structured answer using markdown.\n" +
          "IMPORTANT RULES:\n" +
          "1. Cite sources INLINE using [1], [2], [3] etc. right after each claim\n" +
          "2. Example: \"Rust prevents memory bugs at compile time [2] and performs like C++ [5].\"\n" +
          "3. Do NOT list references at the end. No bibliography. No \"References:\" section.\n" +
          "4. Use **bold** for key terms. Use bullet points for lists.\n" +
          "5. For math, use LaTeX delimiters like $x^2$ or $$E = mc^2$$, never fake equations with markdown italics.\n\n" +
          "Sources:\n" +
          formatResultsForLLM(sourcesForAnswer);

        const finalUserPrompt = `${query}\n\nResearch notes:\n${researchContext}`;

        controller.enqueue(
          encoder.encode(sseEvent("answer_start", {}))
        );

        let fullAnswer = await chatJimmy([
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: finalUserPrompt },
        ], jimmyOpts);

        fullAnswer = fullAnswer
          .replace(
            /\n+\*?\*?(?:References|Sources|Bibliography|Key findings from research|Citations)\*?\*?:?\s*\n(?:\s*\[?\d+\]?[^\n]*\n?)*/gi,
            ""
          )
          .trimEnd();

        fullAnswer = fullAnswer.replace(
          /\[(\d+)(?:\s*,\s*(\d+))+\]/g,
          (match: string) => {
            const nums = match.match(/\d+/g) || [];
            return nums.map((n: string) => `[${n}]`).join("");
          }
        );

        const chunkSize = 12;
        for (let i = 0; i < fullAnswer.length; i += chunkSize) {
          const chunk = fullAnswer.slice(i, i + chunkSize);
          controller.enqueue(
            encoder.encode(sseEvent("answer_chunk", { content: chunk }))
          );
        }

        controller.enqueue(
          encoder.encode(
            sseEvent("all_sources", {
              sources: sourcesForAnswer.map((r) => ({
                title: r.title,
                url: r.url,
                text: r.text,
                highlights: r.highlights,
              })),
            })
          )
        );

        controller.enqueue(encoder.encode(sseEvent("done", {})));
      } catch (error) {
        console.error("Deep research error:", error);
        controller.enqueue(
          encoder.encode(
            sseEvent("error", {
              message:
                error instanceof Error
                  ? error.message
                  : "Research failed",
            })
          )
        );
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
