import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import HistoryTable from '@/components/dashboard/HistoryTable'
import { UploadSummary } from '@/types'
import { getSessionFromCookies } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'

async function getUploads(): Promise<UploadSummary[]> {
  try {
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

export default async function HistoryPage() {
  const uploads = await getUploads()

  return (
    <div>
      <TopBar title="Upload History" />

      <div className="space-y-4 p-4 md:p-6">
        <div className="surface-card p-4">
          <p className="text-label">
            Review previously uploaded files, inspect AI status, and manage exports safely.
          </p>
        </div>

        {uploads.length === 0 ? (
          <div className="surface-panel py-12 text-center">
            <p className="text-muted-foreground">No uploads yet</p>
          </div>
        ) : (
          <HistoryTable uploads={uploads} />
        )}
      </div>
    </div>
  )
}
