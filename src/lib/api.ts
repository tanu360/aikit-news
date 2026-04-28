export async function readJsonRecord(
  req: Request
): Promise<
  | { body: Record<string, unknown>; errorResponse?: never }
  | { body?: never; errorResponse: Response }
> {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return {
        errorResponse: Response.json(
          { error: "Invalid JSON body." },
          { status: 400 }
        ),
      };
    }

    return { body: body as Record<string, unknown> };
  } catch {
    return {
      errorResponse: Response.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      ),
    };
  }
}
