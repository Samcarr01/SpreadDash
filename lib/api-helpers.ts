/**
 * Shared API route helpers
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionFromCookies } from './auth'
import { SessionPayload } from '@/types'

/**
 * Wraps an API route handler with error handling
 *
 * Catches all unhandled errors and returns a generic 500 response.
 * Logs the actual error server-side.
 *
 * @param handler - The route handler function
 * @returns Wrapped handler with error handling
 */
export async function handleApiRoute(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler()
  } catch (error) {
    console.error('[API Error]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Validates the session cookie
 *
 * @param request - Next.js request object
 * @returns Session payload if valid, or 401 NextResponse if invalid
 */
export async function validateSession(
  request: NextRequest
): Promise<SessionPayload | NextResponse> {
  const cookieStore = cookies()
  const session = await getSessionFromCookies(cookieStore)

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return session
}
