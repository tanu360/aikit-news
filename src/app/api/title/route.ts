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
        role: "system",
        content:
          "Create a concise 3-4 word title that captures the topic of this conversation. Use title case. Be specific and descriptive. If the message is only a greeting like hi, hello, hey, or similar, use a greeting-style title such as Greetings Request. Reply with only the title, no punctuation, no quotes, no explanation.",
      },
      {
        role: "user",
        content: message.trim().slice(0, 300),
      },
    ]);
    const cleaned = title
      .trim()
      .replace(/^["'“”‘’]+|["'“”‘’.,:;!?]+$/g, "")
      .slice(0, 50);
    return new Response(JSON.stringify({ title: cleaned }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ title: "" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
