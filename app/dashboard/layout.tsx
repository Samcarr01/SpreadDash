import { cookies } from 'next/headers'
import Sidebar from '@/components/layout/Sidebar'
import { UploadSummary } from '@/types'
import { redirect } from 'next/navigation'

async function getUploads(): Promise<UploadSummary[]> {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('sd_session')

    // Use VERCEL_URL in production, localhost in development
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const response = await fetch(
      `${baseUrl}/api/uploads?limit=100`,
      {
        headers: {
          Cookie: `sd_session=${sessionCookie?.value || ''}`,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        redirect('/')
      }
      return []
    }

    const data = await response.json()
    return data.success ? data.data.uploads : []
  } catch (error) {
    console.error('Failed to fetch uploads:', error)
    return []
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const uploads = await getUploads()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar uploads={uploads} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
