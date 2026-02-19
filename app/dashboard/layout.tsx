import { cookies } from 'next/headers'
import Sidebar from '@/components/layout/Sidebar'
import { UploadSummary } from '@/types'
import { redirect } from 'next/navigation'

async function getUploads(): Promise<UploadSummary[]> {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('sd_session')

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', '') || 'http://localhost:3000'}/api/uploads?limit=100`,
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
