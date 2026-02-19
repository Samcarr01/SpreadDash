/**
 * Authentication utilities using jose for edge-compatible JWT operations
 */

import { SignJWT, jwtVerify } from 'jose'
import { SessionPayload, SessionPayloadSchema, LIMITS } from '@/types'
import { cookies } from 'next/headers'

const SESSION_SECRET = process.env.SESSION_SECRET
const COOKIE_NAME = 'sd_session'

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is not set')
}

// Convert SESSION_SECRET string to Uint8Array for jose
const secretKey = new TextEncoder().encode(SESSION_SECRET)

/**
 * Creates a signed session JWT
 *
 * @returns Signed JWT token string
 */
export async function createSession(): Promise<string> {
  const payload: SessionPayload = {
    authenticated: true,
    issuedAt: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${LIMITS.SESSION_DURATION_SECONDS}s`)
    .sign(secretKey)

  return token
}

/**
 * Verifies a session JWT and checks expiration
 *
 * @param token - JWT token string to verify
 * @returns SessionPayload if valid, null if invalid or expired
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    })

    // Validate payload shape with Zod
    const result = SessionPayloadSchema.safeParse(payload)
    if (!result.success) {
      return null
    }

    const session = result.data

    // Check if session is within 7 days (jose handles exp automatically, but double-check issuedAt)
    const now = Math.floor(Date.now() / 1000)
    const age = now - session.issuedAt

    if (age > LIMITS.SESSION_DURATION_SECONDS) {
      return null
    }

    return session
  } catch (error) {
    // Invalid signature, expired, or malformed token
    return null
  }
}

/**
 * Gets session from Next.js cookies and verifies it
 *
 * @param cookieStore - Next.js cookies() result
 * @returns SessionPayload if valid, null otherwise
 */
export async function getSessionFromCookies(
  cookieStore: ReturnType<typeof cookies>
): Promise<SessionPayload | null> {
  const cookie = cookieStore.get(COOKIE_NAME)

  if (!cookie?.value) {
    return null
  }

  return verifySession(cookie.value)
}

/**
 * Cookie name constant for reuse
 */
export const SESSION_COOKIE_NAME = COOKIE_NAME
