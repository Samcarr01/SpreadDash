import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import Sidebar from '@/components/layout/Sidebar'
import { UploadSummary } from '@/types'
import { getSessionFromCookies } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getUploads(): Promise<UploadSummary[]> {
  try {
    // Always fetch fresh data for sidebar upload list.
    noStore()

    const cookieStore = cookies()
    const session = await getSessionFromCookies(cookieStore)

    if (!session) {
      redirect('/')
    }

    // Query Supabase directly (no HTTP fetch needed)
    const { data: uploads, error } = await supabaseServer
      .from('uploads')
      .select(`
        id,
        filename,
        label,
        uploaded_by,
        file_url,
        file_size_bytes,
        row_count,
        column_count,
        sheet_meta,
        insights_data,
        ai_analysis,
        ai_status,
        status,
        uploaded_at
      `)
      .order('uploaded_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Failed to fetch uploads:', error)
      return []
    }

    return uploads || []
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
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--bg-canvas))]">
      <Sidebar uploads={uploads} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
