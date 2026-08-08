import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  APP_URL: z.string().url().optional(),
  PAYMENT_PROVIDER: z.string().default("mock"),
});

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function getServerEnv() {
  // Guard: never allow service role under NEXT_PUBLIC_
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SECURITY: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY must never be set",
    );
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for server mutations (never use NEXT_PUBLIC_)",
    );
  }
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: key,
    APP_URL: process.env.APP_URL,
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER ?? "mock",
  });
}

export function assertNoServiceRoleLeak(source: string) {
  if (
    source.includes("SERVICE_ROLE") &&
    (source.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY") ||
      /NEXT_PUBLIC_.*SERVICE_ROLE/.test(source))
  ) {
    throw new Error("Service role key must not be exposed to the client");
  }
}
