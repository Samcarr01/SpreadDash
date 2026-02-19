import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import DashboardTabs from '@/components/dashboard/DashboardTabs'
import { UploadRecord } from '@/types'
import { getSessionFromCookies } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'

async function getUpload(id: string): Promise<UploadRecord | null> {
  try {
    const cookieStore = cookies()
    const session = await getSessionFromCookies(cookieStore)

    if (!session) {
      redirect('/')
    }

    // Query Supabase directly (no HTTP fetch needed)
    const { data: upload, error } = await supabaseServer
      .from('uploads')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      console.error('Failed to fetch upload:', error)
      return null
    }

    return upload
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
