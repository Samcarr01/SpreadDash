'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, Loader2, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ThemeToggle } from '@/components/theme-toggle'

interface TopBarProps {
  title: string
  breadcrumb?: string
  showExport?: boolean
}

export default function TopBar({
  title,
  breadcrumb,
  showExport = false,
}: TopBarProps) {
  const params = useParams()
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!params?.id) return

    setIsExporting(true)

    // Show loading toast
    toast({
      title: 'Generating PDF...',
      description: 'Please wait while we create your report.',
    })

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId: params.id,
          label: title,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.pdf_url) {
          // Show success toast with download link
          toast({
            title: 'PDF exported successfully!',
            description: (
              <div className="flex items-center gap-2">
                <span>Your report is ready.</span>
                <a
                  href={data.data.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Download
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ),
          })

          // Also open in new tab
          window.open(data.data.pdf_url, '_blank')
        }
      } else {
        const errorData = await response.json()
        toast({
          variant: 'destructive',
          title: 'Export failed',
          description: errorData.error || 'Failed to generate PDF. Please try again.',
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      toast({
        variant: 'destructive',
        title: 'Export error',
        description: 'An error occurred while generating the PDF.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 p-4 pl-16 md:px-6 md:pl-6">
        <div className="min-w-0">
          {breadcrumb && (
            <p className="kicker mb-1">{breadcrumb}</p>
          )}
          <h1 className="truncate text-2xl font-semibold md:text-3xl">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Spreadsheet analytics, trend monitoring, and export reporting.
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge variant="secondary" className="hidden md:inline-flex">
            Live View
          </Badge>
          <ThemeToggle />

          {showExport && (
            <Button onClick={handleExport} disabled={isExporting} className="font-semibold">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
