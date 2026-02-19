import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { timingSafeEqual } from 'crypto'
import { LoginRequestSchema, LIMITS } from '@/types'
import { createSession, SESSION_COOKIE_NAME } from '@/lib/auth'

if (!process.env.ACCESS_CODE) {
  throw new Error('ACCESS_CODE environment variable is not set')
}

const ACCESS_CODE = process.env.ACCESS_CODE

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = LoginRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { code } = validation.data

    // Timing-safe comparison to prevent timing attacks
    // Convert both strings to Buffers of equal length
    let isValid = false
    try {
      // Pad shorter buffer to match longer one
      const maxLength = Math.max(code.length, ACCESS_CODE.length)
      const codeBuffer = Buffer.from(code.padEnd(maxLength, '\0'))
      const secretBuffer = Buffer.from(ACCESS_CODE.padEnd(maxLength, '\0'))

      isValid = timingSafeEqual(codeBuffer, secretBuffer) && code.length === ACCESS_CODE.length
    } catch (error) {
      // If buffers are different lengths or any other error, fail safely
      isValid = false
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid access code' },
        { status: 401 }
      )
    }

    // Create session JWT
    const token = await createSession()

    // Set secure HTTP-only cookie
    const cookieStore = cookies()
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: LIMITS.SESSION_DURATION_SECONDS,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Login Error]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
