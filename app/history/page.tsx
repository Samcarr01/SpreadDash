import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UploadSummary } from '@/types'
import Link from 'next/link'
import { ExternalLink, Eye } from 'lucide-react'

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

export default async function HistoryPage() {
  const uploads = await getUploads()

  return (
    <div>
      <TopBar title="Upload History" />

      <div className="p-6">
        {uploads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No uploads yet</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Columns</TableHead>
                  <TableHead>AI Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="font-medium">
                      {upload.label || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {upload.filename}
                    </TableCell>
                    <TableCell>{upload.uploaded_by}</TableCell>
                    <TableCell>
                      {new Date(upload.uploaded_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {upload.row_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {upload.column_count}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          upload.ai_status === 'completed'
                            ? 'default'
                            : upload.ai_status === 'failed'
                            ? 'destructive'
                            : upload.ai_status === 'pending'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {upload.ai_status === 'completed'
                          ? 'Completed'
                          : upload.ai_status === 'failed'
                          ? 'Failed'
                          : upload.ai_status === 'pending'
                          ? 'Pending'
                          : 'Skipped'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/dashboard/${upload.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <a
                          href={upload.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
