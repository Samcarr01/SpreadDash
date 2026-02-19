import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser Supabase Client
 *
 * Uses public anon key - safe for client-side use.
 * Limited permissions via RLS policies.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
