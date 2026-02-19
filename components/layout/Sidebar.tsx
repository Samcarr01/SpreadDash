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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Upload,
  Search,
  LogOut,
  FileSpreadsheet,
  Menu,
  X,
  MoreVertical,
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold">SpreadDash</h1>
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
          <Button className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            New Upload
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search uploads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
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
                    className={`group relative p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Link
                      href={`/dashboard/${upload.id}`}
                      onClick={() => setIsMobileOpen(false)}
                      className="block"
                    >
                      <div className="flex items-start gap-2 pr-8">
                        <FileSpreadsheet
                          className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                            isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {upload.label || upload.filename}
                          </p>
                          <p
                            className={`text-xs truncate ${
                              isActive
                                ? 'text-primary-foreground/80'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {new Date(upload.uploaded_at).toLocaleDateString(
                              'en-GB',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              }
                            )}
                          </p>
                          <div className="flex gap-1 mt-1">
                            <Badge
                              variant={isActive ? 'outline' : 'secondary'}
                              className="text-xs"
                            >
                              {upload.row_count} rows
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Delete Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity ${
                            isActive ? 'hover:bg-primary-foreground/20' : ''
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.preventDefault()
                            setDeleteTarget(upload)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Logout Button */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
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
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
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
      <aside className="hidden md:block w-[280px] border-r bg-background h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 w-[280px] border-r bg-background h-screen z-50 transition-transform md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
