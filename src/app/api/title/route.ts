import { NextRequest } from "next/server";
import { chatJimmy } from "@/lib/jimmy";

export async function POST(req: NextRequest) {
  const { message } = (await req.json()) as { message: string };
  if (!message?.trim()) {
    return new Response(JSON.stringify({ title: "" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const title = await chatJimmy([
      {
        role: "user",
        content:
          `Create a concise 3-4 word title that captures the topic of this conversation. Use title case. Be specific and descriptive. Reply with only the title, no punctuation, no quotes, no explanation.\n\nMessage:\n${message.trim().slice(0, 300)}`,
      },
    ]);
    return new Response(JSON.stringify({ title: title.trim().slice(0, 50) }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ title: "" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
