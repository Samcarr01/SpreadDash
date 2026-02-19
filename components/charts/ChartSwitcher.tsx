'use client'

import { HeadlineChartConfig } from '@/types'
import LineChartCard from './LineChartCard'
import BarChartCard from './BarChartCard'
import AreaChartCard from './AreaChartCard'
import { Card } from '@/components/ui/card'

interface ChartSwitcherProps {
  data: Array<Record<string, unknown>>
  config: HeadlineChartConfig
  colours?: readonly string[]
}

export default function ChartSwitcher({
  data,
  config,
  colours,
}: ChartSwitcherProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground text-center">
          No data available for chart
        </p>
      </Card>
    )
  }

  if (!config.xAxisColumn || config.seriesColumns.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground text-center">
          Invalid chart configuration
        </p>
      </Card>
    )
  }

  const commonProps = {
    data,
    xKey: config.xAxisColumn,
    yKeys: config.seriesColumns,
    title: config.title,
    colours,
  }

  switch (config.chartType) {
    case 'line':
      return <LineChartCard {...commonProps} />
    case 'bar':
      return <BarChartCard {...commonProps} />
    case 'area':
      return <AreaChartCard {...commonProps} />
    default:
      return (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            Unknown chart type
          </p>
        </Card>
      )
  }
}
