import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SESSION_SECRET = process.env.SESSION_SECRET
const COOKIE_NAME = 'sd_session'

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is not set')
}

const secretKey = new TextEncoder().encode(SESSION_SECRET)

// Protected routes that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/history',
  '/api/upload',
  '/api/uploads',
  '/api/export',
]

// Unprotected routes that should always be accessible
const UNPROTECTED_PATHS = [
  '/',
  '/api/auth',
  '/_next',
  '/favicon.ico',
]

/**
 * Checks if a path is protected
 */
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => {
    if (path.endsWith('*')) {
      return pathname.startsWith(path.slice(0, -1))
    }
    return pathname === path || pathname.startsWith(path + '/')
  })
}

/**
 * Checks if a path is explicitly unprotected
 */
function isUnprotectedPath(pathname: string): boolean {
  return UNPROTECTED_PATHS.some((path) => {
    return pathname === path || pathname.startsWith(path + '/')
  })
}

/**
 * Verifies the session token
 */
async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    })
    return true
  } catch (error) {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip unprotected paths
  if (isUnprotectedPath(pathname)) {
    return NextResponse.next()
  }

  // Check protected paths
  if (isProtectedPath(pathname)) {
    const token = request.cookies.get(COOKIE_NAME)?.value

    if (!token) {
      // No token found
      if (pathname.startsWith('/api/')) {
        // API route - return 401 JSON
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      } else {
        // Page route - redirect to login
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Verify token
    const isValid = await verifySessionToken(token)

    if (!isValid) {
      // Invalid or expired token
      if (pathname.startsWith('/api/')) {
        // API route - return 401 JSON
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      } else {
        // Page route - redirect to login
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
