'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Auto-focus the input on mount
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        setError(data.error || 'Invalid access code')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="surface-card w-full max-w-md border-border/70">
      <CardHeader>
        <p className="kicker text-center">Secure Team Access</p>
        <CardTitle className="text-center text-3xl font-semibold">Enter Workspace</CardTitle>
        <p className="text-center text-sm text-muted-foreground">
          Use your shared access code to open the dashboard.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-xs uppercase tracking-wider text-muted-foreground">
              Access Code
            </Label>
            <Input
              ref={inputRef}
              id="code"
              type="password"
              placeholder="Enter your code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isLoading}
              required
              className="h-11 border-border/70 bg-background/80"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
