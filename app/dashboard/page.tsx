import { cookies } from 'next/headers'
import DropZone from '@/components/upload/DropZone'
import TopBar from '@/components/layout/TopBar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UploadSummary } from '@/types'
import Link from 'next/link'
import { FileSpreadsheet, Upload } from 'lucide-react'

async function getUploads(): Promise<UploadSummary[]> {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('sd_session')

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', '') || 'http://localhost:3000'}/api/uploads?limit=12`,
      {
        headers: {
          Cookie: `sd_session=${sessionCookie?.value || ''}`,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return data.success ? data.data.uploads : []
  } catch (error) {
    console.error('Failed to fetch uploads:', error)
    return []
  }
}

export default async function DashboardPage() {
  const uploads = await getUploads()

  return (
    <div>
      <TopBar title="Dashboard" />

      <div className="p-6 space-y-8">
        {/* Upload Zone */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Upload New Spreadsheet</h2>
          <DropZone />
        </section>

        {/* Recent Uploads */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Recent Uploads</h2>

          {uploads.length === 0 ? (
            <Card className="p-12 text-center">
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
                  <Card className="p-4 hover:border-primary transition-colors cursor-pointer h-full">
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
