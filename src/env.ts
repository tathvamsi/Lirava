import "server-only";

import { z } from "zod";

const DEV_SESSION_SECRET =
  "development-only-soli-session-secret-change-before-production";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z
      .string()
      .optional()
      .default("postgres://postgres:postgres@localhost:5432/soli"),
    SESSION_SECRET: z
      .string()
      .optional()
      .default(DEV_SESSION_SECRET),
    SESSION_MAX_AGE_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(7 * 24 * 60 * 60),
    ADMIN_EMAILS: z.string().optional().default(""),
    SIGNUP_INVITE_CODES: z.string().optional().default(""),
    SIGNUP_ALLOWED_DOMAINS: z.string().optional().default(""),
    DEMO_SEED: z.string().optional().default(""),
  })
  .superRefine((value, ctx) => {
    const isBuildPhase =
      process.env.SKIP_ENV_VALIDATION === "1" ||
      process.env.SKIP_ENV_VALIDATION === "true" ||
      process.env.NEXT_PHASE === "phase-production-build";

    if (
      !isBuildPhase &&
      value.NODE_ENV === "production" &&
      value.SESSION_SECRET === DEV_SESSION_SECRET
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["SESSION_SECRET"],
        message: "SESSION_SECRET is required in production",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n  ");
  throw new Error(`Invalid Lirava environment variables:\n  ${details}`);
}

export const env = parsed.data;
