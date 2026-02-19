'use client'

import { useState, useEffect } from 'react'
import { SheetMeta, ChartConfig } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon, Plus, X } from 'lucide-react'

interface ColumnPickerProps {
  sheetMeta: SheetMeta
  onChange: (config: ChartConfig) => void
  initialConfig?: ChartConfig
}

export default function ColumnPicker({
  sheetMeta,
  onChange,
  initialConfig,
}: ColumnPickerProps) {
  const [xAxis, setXAxis] = useState(
    initialConfig?.xAxisColumn || sheetMeta.headers[0]
  )
  const [yAxes, setYAxes] = useState<string[]>(
    initialConfig?.yAxisColumns || []
  )
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>(
    initialConfig?.chartType || 'line'
  )

  useEffect(() => {
    onChange({
      xAxisColumn: xAxis,
      yAxisColumns: yAxes,
      chartType,
    })
  }, [xAxis, yAxes, chartType, onChange])

  const availableYAxes = sheetMeta.headers.filter((h) => h !== xAxis)

  const addYAxis = (column: string) => {
    if (!yAxes.includes(column) && yAxes.length < 5) {
      setYAxes([...yAxes, column])
    }
  }

  const removeYAxis = (column: string) => {
    setYAxes(yAxes.filter((y) => y !== column))
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Chart Type Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">Chart Type</label>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <LineChartIcon className="h-4 w-4 mr-2" />
              Line
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Bar
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
            >
              <AreaChartIcon className="h-4 w-4 mr-2" />
              Area
            </Button>
          </div>
        </div>

        {/* X Axis Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">X Axis</label>
          <Select value={xAxis} onValueChange={setXAxis}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sheetMeta.headers.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Y Axes Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Y Axis (Series) - {yAxes.length}/5
          </label>

          {/* Selected Y Axes */}
          {yAxes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {yAxes.map((y) => (
                <Badge key={y} variant="secondary" className="pl-2 pr-1">
                  {y}
                  <button
                    onClick={() => removeYAxis(y)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Add Y Axis Dropdown */}
          {yAxes.length < 5 && availableYAxes.length > 0 && (
            <Select
              onValueChange={addYAxis}
              value="" // Controlled to reset after selection
            >
              <SelectTrigger>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Plus className="h-4 w-4" />
                  <span>Add series...</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {availableYAxes
                  .filter((h) => !yAxes.includes(h))
                  .map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Info */}
        {yAxes.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Select at least one series to display the chart
          </p>
        )}
      </div>
    </Card>
  )
}
