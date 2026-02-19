import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="p-6 flex items-center justify-center min-h-screen">
      <Card className="p-8 max-w-md text-center">
        <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Upload not found</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The upload you're looking for doesn't exist or has been deleted.
        </p>
        <Link href="/dashboard">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </Card>
    </div>
  )
}
