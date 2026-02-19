import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Activity, Calendar, Columns, Rows } from 'lucide-react'

interface OverviewHeaderProps {
  rowCount: number
  channelCount: number
  periodCount: number | null
  uploadedAt: string
  focusAreas?: string[]
}

export default function OverviewHeader({
  rowCount,
  channelCount,
  periodCount,
  uploadedAt,
  focusAreas = [],
}: OverviewHeaderProps) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/12 p-2">
              <Rows className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-label">Total Rows</p>
              <p className="text-2xl font-semibold">{rowCount.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/12 p-2">
              <Columns className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-label">Channels</p>
              <p className="text-2xl font-semibold">{channelCount}</p>
            </div>
          </div>
        </Card>

        <Card className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/12 p-2">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-label">Time Periods</p>
              <p className="text-2xl font-semibold">{periodCount ?? '-'}</p>
            </div>
          </div>
        </Card>

        <Card className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/12 p-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-label">Uploaded</p>
              <p className="text-sm font-semibold">
                {new Date(uploadedAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {focusAreas.length > 0 && (
        <Card className="surface-card p-4">
          <p className="kicker mb-3">AI Focus Areas</p>
          <div className="flex flex-wrap gap-2">
            {focusAreas.slice(0, 4).map((area) => (
              <Badge key={area} variant="secondary" className="font-medium">
                {area}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </section>
  )
}
