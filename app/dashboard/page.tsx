import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DropZone from '@/components/upload/DropZone'
import TopBar from '@/components/layout/TopBar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UploadSummary } from '@/types'
import Link from 'next/link'
import { FileSpreadsheet, Upload } from 'lucide-react'
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
      .limit(12)

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

export default async function DashboardPage() {
  const uploads = await getUploads()
  const completedAI = uploads.filter((upload) => upload.ai_status === 'completed').length
  const failedAI = uploads.filter((upload) => upload.ai_status === 'failed').length
  const latestUpload = uploads[0]?.uploaded_at

  return (
    <div>
      <TopBar title="Dashboard" />

      <div className="space-y-8 p-4 md:p-6">
        {/* Upload Zone */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">Upload New Spreadsheet</h2>
          <DropZone />
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Quick Status</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="surface-card p-4">
              <p className="text-label">Saved Dashboards</p>
              <p className="mt-1 text-3xl font-semibold">{uploads.length}</p>
            </Card>
            <Card className="surface-card p-4">
              <p className="text-label">AI Analyses Completed</p>
              <p className="mt-1 text-3xl font-semibold">{completedAI}</p>
              {failedAI > 0 && (
                <p className="mt-1 text-xs text-destructive">{failedAI} failed and can be regenerated</p>
              )}
            </Card>
            <Card className="surface-card p-4">
              <p className="text-label">Latest Upload</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {latestUpload
                  ? new Date(latestUpload).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'No uploads yet'}
              </p>
            </Card>
          </div>
        </section>

        {/* Recent Uploads */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">Recent Uploads</h2>

          {uploads.length === 0 ? (
            <Card className="surface-panel p-12 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No uploads yet</h3>
              <p className="text-sm text-muted-foreground">
                Upload your first spreadsheet above to get started
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploads.map((upload) => (
                <Link key={upload.id} href={`/dashboard/${upload.id}`}>
                  <Card className="surface-card h-full cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50">
                    <div className="flex items-start gap-3">
                      <FileSpreadsheet className="h-8 w-8 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1 truncate">
                          {upload.label || upload.filename}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2 truncate">
                          {upload.filename}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {upload.row_count} rows
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {upload.column_count} cols
                          </Badge>
                          {upload.ai_status === 'completed' && (
                            <Badge variant="outline" className="text-xs">
                              AI ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(upload.uploaded_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })} • {upload.uploaded_by}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
