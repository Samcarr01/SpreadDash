'use client'

import { useState } from 'react'
import { UploadSummary } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import {
  Upload,
  Search,
  LogOut,
  FileSpreadsheet,
  Menu,
  X,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

interface SidebarProps {
  uploads: UploadSummary[]
}

export default function Sidebar({ uploads }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UploadSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

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
        // Redirect to dashboard if we're viewing the deleted upload
        if (pathname.includes(deleteTarget.id)) {
          router.push('/dashboard')
        }
        // Refresh the page to update the sidebar
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

  const filteredUploads = uploads.filter(
    (upload) =>
      upload.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.label?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[hsl(var(--bg-surface)/0.95)] backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-border/70 p-4">
        <div className="flex items-center justify-between mb-4">
          <Link href="/dashboard">
            <div>
              <p className="kicker">Workspace</p>
              <h1 className="font-display text-[28px] font-semibold leading-none">SpreadDash</h1>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* New Upload Button */}
        <Link href="/dashboard">
          <Button className="h-10 w-full justify-center font-semibold shadow-sm">
            <Upload className="h-4 w-4 mr-2" />
            New Upload
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="border-b border-border/70 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search uploads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 border-border/80 bg-[hsl(var(--bg-raised)/0.9)] pl-9 text-[13px]"
          />
        </div>
      </div>

      {/* Upload List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredUploads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchTerm ? 'No uploads found' : 'No uploads yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUploads.map((upload) => {
                const isActive = pathname.includes(upload.id)
                return (
                  <div
                    key={upload.id}
                    className={`group relative rounded-xl border p-3 transition-colors ${
                      isActive
                        ? 'border-primary/40 bg-[hsl(var(--bg-raised))] text-foreground'
                        : 'border-transparent hover:border-border/80 hover:bg-[hsl(var(--bg-raised)/0.78)]'
                    }`}
                  >
                    <Link
                      href={`/dashboard/${upload.id}`}
                      onClick={() => setIsMobileOpen(false)}
                      className="block"
                    >
                      <div className="flex items-start gap-2">
                        <FileSpreadsheet
                          className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                            isActive ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {upload.label || upload.filename}
                          </p>
                          <p className="text-xs truncate text-muted-foreground">
                            {new Date(upload.uploaded_at).toLocaleDateString(
                              'en-GB',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              }
                            )}
                          </p>
                          <div className="mt-1 flex gap-1">
                            <Badge
                              variant={isActive ? 'outline' : 'secondary'}
                              className="text-xs font-medium"
                            >
                              {upload.row_count} rows
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Delete ${upload.label || upload.filename}`}
                        className="h-7 w-full justify-center border-destructive/40 bg-destructive/10 text-xs font-medium text-destructive hover:bg-destructive/15 hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setDeleteTarget(upload)
                        }}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Logout Button */}
      <div className="border-t border-border/70 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start rounded-lg font-medium"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Delete Confirmation Dialog */}
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

      {/* Mobile Toggle */}
      <Button
        variant="secondary"
        size="icon"
        className="fixed left-4 top-4 z-50 border border-border/70 bg-[hsl(var(--bg-raised))] shadow-sm md:hidden"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[300px] border-r border-border/70 md:block">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-[300px] border-r border-border/70 transition-transform md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
