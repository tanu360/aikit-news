import { NextResponse } from "next/server";

export async function GET() {
  const modelName =
    process.env.CHATJIMMY_MODEL ||
    process.env.NEXT_PUBLIC_CHATJIMMY_MODEL ||
    process.env.NEXT_PUBLIC_MODEL_NAME ||
    "AI Model";

  return NextResponse.json({ modelName });
}
