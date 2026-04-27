import { NextRequest } from "next/server";
import { chatJimmy, chatJimmyCompletion } from "@/lib/jimmy";
import type { ChatJimmyAttachment, ChatJimmyOptions } from "@/lib/jimmy";
import { appendUserSystemPrompt, normalizePromptDate } from "@/lib/prompts";

const EXA_API_KEY = process.env.EXA_API_KEY || "";

// Controlled research tree:
//   Depth 0: 1 search (original query)        -> 2 follow-ups
//   Depth 1: 2 searches (follow-ups)          -> 1 follow-up each
//   Depth 2: 2 searches (deeper follow-ups)   -> no follow-ups
// Total: 5 searches, ~25-30 sources - fits Llama 8B context comfortably

const MAX_DEPTH = 3;
const MAX_SOURCES_FOR_ANSWER = 18;

type ExaSearchResult = {
  title: string;
  url: string;
  text?: string;
  highlights?: string[];
};

type SearchExaResponse = {
  results: ExaSearchResult[];
  error?: string;
};

async function searchExa(query: string): Promise<SearchExaResponse> {
  if (!EXA_API_KEY) {
    return {
      results: [],
      error: "Search is not configured.",
    };
  }

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": EXA_API_KEY,
      },
      body: JSON.stringify({
        query,
        type: "auto",
        numResults: 5,
        contents: {
          text: { maxCharacters: 1000 },
          highlights: { numSentences: 2 },
        },
      }),
    });

    if (!response.ok) {
      console.error("Exa search failed:", await response.text());
      return {
        results: [],
        error: "Search failed before returning usable sources.",
      };
    }

    const data = await response.json();
    return { results: Array.isArray(data.results) ? data.results : [] };
  } catch (error) {
    console.error("Exa search failed:", error);
    return {
      results: [],
      error: "Search failed before returning usable sources.",
    };
  }
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
      if (r.text) {
        entry += `\nContent: ${r.text.slice(0, 400)}`;
      }
      return entry;
    })
    .join("\n\n");
}

function sseEvent(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

function streamAnswerText(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  content: string
) {
  const chunkSize = 12;
  for (let i = 0; i < content.length; i += chunkSize) {
    const chunk = content.slice(i, i + chunkSize);
    controller.enqueue(
      encoder.encode(sseEvent("answer_chunk", { content: chunk }))
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, topK, systemPrompt, attachment, clientDate } = body as {
    query: string;
    topK?: number;
    systemPrompt?: string;
    attachment?: ChatJimmyAttachment;
    clientDate?: string;
  };
  const jimmyOpts: ChatJimmyOptions = {
    ...(topK != null ? { topK } : {}),
    ...(attachment ? { attachment } : {}),
  };
  const today = normalizePromptDate(clientDate);

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

            const search = await searchExa(currentQuery);
            const results = search.results;
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

            if (results.length === 0) {
              const synthesis = search.error
                ? `No usable sources found for "${currentQuery}" because search failed.`
                : `No usable sources found for "${currentQuery}".`;

              controller.enqueue(
                encoder.encode(
                  sseEvent("step_done", {
                    stepId,
                    synthesis,
                    followUps: [],
                  })
                )
              );
              continue;
            }

            const previousContext =
              allSyntheses.length > 0
                ? "Previous research found:\n" +
                allSyntheses
                  .map((s) => `- ${s.synthesis}`)
                  .join("\n") +
                "\n\n"
                : "";

            const baseSystemPrompt = isLastDepth
              ? `You are AiKit research assistant. Today is ${today}. Write a 2-3 sentence synthesis of the new findings. Do NOT generate follow-up questions.`
              : `You are AiKit research assistant. Today is ${today}. Given search results, do two things:\n` +
              "1. Write a 2-3 sentence synthesis of what was found.\n" +
              `2. List exactly ${maxFollowUpsPerStep} follow-up question${maxFollowUpsPerStep > 1 ? "s" : ""} to deepen understanding. Each MUST start on its own line with \"FOLLOW_UP:\" prefix.\n\n` +
              "Example:\nThe results show X is important for Y. Key findings suggest Z.\n\n" +
              "FOLLOW_UP: What mechanisms cause Y?\n" +
              (maxFollowUpsPerStep > 1
                ? "FOLLOW_UP: How does Z compare to alternatives?"
                : "");
            const researchSystemPrompt = appendUserSystemPrompt(
              baseSystemPrompt,
              systemPrompt
            );

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
              researchSystemPrompt,
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
              totalSources: uniqueSources.length,
              sources: uniqueSources.map((r) => ({
                title: r.title,
                url: r.url,
              })),
            })
          )
        );

        if (uniqueSources.length === 0) {
          controller.enqueue(
            encoder.encode(sseEvent("answer_start", {}))
          );
          streamAnswerText(
            controller,
            encoder,
            "I couldn't find usable research sources for this query. Try rephrasing the question or checking the search setup, then run Deep Research again."
          );
          controller.enqueue(
            encoder.encode(sseEvent("all_sources", { sources: [] }))
          );
          controller.enqueue(encoder.encode(sseEvent("done", {})));
          controller.close();
          return;
        }

        const researchContext = allSyntheses
          .map((s) => `- ${s.synthesis}`)
          .join("\n");

        const finalSystemPrompt = appendUserSystemPrompt(
          "You are AiKit, a helpful AI assistant. Today is " + today + ". Write a well-structured answer using markdown.\n" +
          "IMPORTANT RULES:\n" +
          "1. Cite sources INLINE using [1], [2], [3] etc. right after each claim\n" +
          "2. Example: \"Rust prevents memory bugs at compile time [2] and performs like C++ [5].\"\n" +
          "3. Do NOT list references at the end. No bibliography. No \"References:\" section.\n" +
          "4. Use **bold** for key terms. Use bullet points for lists.\n" +
          "5. For math, use LaTeX delimiters like $x^2$ or $$E = mc^2$$, never fake equations with markdown italics.\n\n" +
          "Sources:\n" +
          formatResultsForLLM(sourcesForAnswer),
          systemPrompt
        );

        const finalUserPrompt = `${query}\n\nResearch notes:\n${researchContext}`;

        controller.enqueue(
          encoder.encode(sseEvent("answer_start", {}))
        );

        const finalCompletion = await chatJimmyCompletion([
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: finalUserPrompt },
        ], jimmyOpts);
        let fullAnswer = finalCompletion.content;

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

        streamAnswerText(controller, encoder, fullAnswer);

        if (finalCompletion.generationStats) {
          controller.enqueue(
            encoder.encode(
              sseEvent("generation_stats", {
                stats: finalCompletion.generationStats,
              })
            )
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
