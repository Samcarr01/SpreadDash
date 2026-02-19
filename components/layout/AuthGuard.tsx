'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Client-side auth guard component
 *
 * Checks for session cookie on mount and redirects to login if missing.
 * Note: This is NOT a security check - it's purely for UX.
 * Real security is enforced by middleware and API route checks.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check if session cookie exists (client-side only, not cryptographically verified)
    const hasSessionCookie = document.cookie
      .split('; ')
      .some((cookie) => cookie.startsWith('sd_session='))

    if (!hasSessionCookie) {
      // No session cookie found - redirect to login
      router.push('/')
    } else {
      // Cookie exists - allow render
      setIsChecking(false)
    }
  }, [router])

  if (isChecking) {
    // Show loading skeleton while checking
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-12 w-[300px]" />
          <Skeleton className="h-12 w-[300px]" />
          <Skeleton className="h-12 w-[300px]" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
