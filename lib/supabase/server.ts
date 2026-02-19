/**
 * SERVER ONLY — never import this in client components
 *
 * This client uses the service role key which bypasses RLS.
 * Only use in API routes and server components.
 */

import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
}

/**
 * Server-side Supabase client with service role privileges
 *
 * WARNING: This bypasses Row Level Security.
 * Use only in trusted server-side code.
 */
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
