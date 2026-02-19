import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import DashboardTabs from '@/components/dashboard/DashboardTabs'
import { UploadRecord } from '@/types'

async function getUpload(id: string): Promise<UploadRecord | null> {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('sd_session')

    // Use VERCEL_URL in production, localhost in development
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const response = await fetch(
      `${baseUrl}/api/uploads/${id}`,
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
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch upload')
    }

    const data = await response.json()
    return data.success ? data.data : null
  } catch (error) {
    console.error('Failed to fetch upload:', error)
    return null
  }
}

export default async function DashboardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const upload = await getUpload(id)

  if (!upload) {
    notFound()
  }

  const handleExport = async () => {
    'use server'
    // This will be handled client-side via TopBar
  }

  return (
    <div>
      <TopBar
        title={upload.label || upload.filename}
        breadcrumb="Dashboard"
        showExport={true}
      />

      <div className="p-6">
        <DashboardTabs upload={upload} />
      </div>
    </div>
  )
}
