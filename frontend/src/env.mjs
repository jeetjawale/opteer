import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL").startsWith("https://", "NEXT_PUBLIC_SUPABASE_URL must use HTTPS"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_API_URL: z.string().url("NEXT_PUBLIC_API_URL must be a valid URL"),
});

export const validateClientEnv = (env) => {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL,
  });

  if (!parsed.success) {
    console.error("❌ Invalid Frontend Environment Variables:\n", JSON.stringify(parsed.error.format(), null, 2));
    throw new Error("Invalid Frontend Environment Variables. Application startup halted.");
  }

  return parsed.data;
};
