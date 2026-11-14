import { NextResponse } from "next/server";
import { z } from "zod";
import { BACKEND_URL } from "@/lib/backend-client";

const submissionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  firm: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(100),
  practiceArea: z.string().trim().max(120).optional(),
  teamSize: z.enum(["1", "2–10", "11–50", "51+"]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete all required fields with valid details." }, { status: 400 });
  }
  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const res = await fetch(`${BACKEND_URL}/api/public/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(clientIp ? { "x-forwarded-for": clientIp } : {}) },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "We could not save your details. Please try again shortly." }, { status: 503 });
  }
}
