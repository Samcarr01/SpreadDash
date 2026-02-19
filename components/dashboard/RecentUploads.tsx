'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, Trash2 } from 'lucide-react'
import { UploadSummary } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface RecentUploadsProps {
  uploads: UploadSummary[]
}

export default function RecentUploads({ uploads }: RecentUploadsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<UploadSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/uploads/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Deleted',
          description: `"${deleteTarget.label || deleteTarget.filename}" has been deleted.`,
        })
        router.refresh()
      } else {
        const data = await response.json()
        toast({
          variant: 'destructive',
          title: 'Delete failed',
          description: data.error || 'Failed to delete the upload.',
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while deleting.',
      })
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (uploads.length === 0) {
    return null
  }

  return (
    <>
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Upload?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.label || deleteTarget?.filename}"?
              This will permanently remove the spreadsheet and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {uploads.map((upload) => (
          <Card key={upload.id} className="surface-card h-full p-4">
            <Link href={`/dashboard/${upload.id}`} className="block">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-8 w-8 flex-shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 truncate text-sm font-semibold">
                    {upload.label || upload.filename}
                  </h3>
                  <p className="mb-2 truncate text-xs text-muted-foreground">
                    {upload.filename}
                  </p>
                  <div className="mb-2 flex flex-wrap gap-2">
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
            </Link>

            <div className="mt-3 flex justify-end border-t border-border/60 pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(upload)}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
