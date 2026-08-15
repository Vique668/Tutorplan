import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for Client Components and browser-only code.
 * No client is created until this function is called.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
