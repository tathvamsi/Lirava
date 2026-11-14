import { NextResponse } from "next/server";
import { z } from "zod";
import { BACKEND_URL } from "@/lib/backend-client";

const surveySchema = z.object({
  practiceArea: z.string().trim().min(1).max(200),
  timeLost: z.string().trim().min(1).max(2000),
  tools: z.string().trim().max(500).optional(),
  pilot: z.enum(["Yes", "Maybe", "Not currently"]),
});

export async function POST(request: Request) {
  const parsed = surveySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const res = await fetch(`${BACKEND_URL}/api/public/survey`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(clientIp ? { "x-forwarded-for": clientIp } : {}) },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "We could not save your answers. Please try again shortly." }, { status: 503 });
  }
}
