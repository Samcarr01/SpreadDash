'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { UploadSummary } from '@/types'
import Link from 'next/link'
import { ExternalLink, Eye, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface HistoryTableProps {
  uploads: UploadSummary[]
}

export default function HistoryTable({ uploads }: HistoryTableProps) {
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
    } catch (error) {
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
                  <div className="flex items-center justify-end gap-1">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(upload)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
