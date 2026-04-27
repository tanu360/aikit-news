import { NextRequest, NextResponse } from "next/server";
import { normalizeChatToolSettings } from "@/lib/toolSettings";

export async function POST(req: NextRequest) {
  const tEntry = Date.now();
  const { query, toolSettings: rawToolSettings } = await req.json();
  const tParsed = Date.now();
  const toolSettings = normalizeChatToolSettings(rawToolSettings);

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  if (!toolSettings.search) {
    return NextResponse.json(
      {
        error:
          "Search tool is disabled. Enable Search in Tools settings to search the web.",
      },
      { status: 403 }
    );
  }

  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "EXA_API_KEY not configured" }, { status: 500 });
  }

  try {
    const tFetchStart = Date.now();
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        type: "instant",
        numResults: 8,
        moderation: true,
        contents: {
          text: { maxCharacters: 1500 },
          highlights: {
            maxCharacters: 3000,
            query,
          },
          maxAgeHours: 24,
        },
      }),
    });
    const tFetchHeaders = Date.now();

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Exa API error:", errorText);
      return NextResponse.json({ results: [] });
    }

    const data = await response.json();
    const tFetchBody = Date.now();

    const serverTiming = [
      `req_parse;dur=${tParsed - tEntry}`,
      `pre_fetch;dur=${tFetchStart - tParsed}`,
      `exa_ttfb;dur=${tFetchHeaders - tFetchStart}`,
      `exa_body;dur=${tFetchBody - tFetchHeaders}`,
      `total;dur=${tFetchBody - tEntry}`,
    ].join(", ");

    return new NextResponse(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Server-Timing": serverTiming,
        "x-debug-timing": serverTiming,
        "Access-Control-Expose-Headers": "Server-Timing, x-debug-timing",
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [] });
  }
}
