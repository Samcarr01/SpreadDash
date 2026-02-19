'use client'

import { UploadRecord } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import KPICardGrid from './KPICardGrid'
import ChartSwitcher from '../charts/ChartSwitcher'
import DataTable from './DataTable'
import AIInsightsPanel from './AIInsightsPanel'
import ColumnPicker from './ColumnPicker'
import { useState } from 'react'
import type { ChartConfig } from '@/types'

interface DashboardTabsProps {
  upload: UploadRecord
}

export default function DashboardTabs({ upload }: DashboardTabsProps) {
  const [customChartConfig, setCustomChartConfig] = useState<ChartConfig | null>(null)

  const chartConfig = customChartConfig || {
    xAxisColumn: upload.insights_data?.headlineChart.xAxisColumn || upload.sheet_meta.headers[0],
    yAxisColumns: upload.insights_data?.headlineChart.seriesColumns || [],
    chartType: upload.insights_data?.headlineChart.chartType || 'line',
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="charts">Charts</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
        <TabsTrigger value="insights">Insights</TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6 mt-6">
        {/* KPI Cards */}
        {upload.insights_data && upload.insights_data.kpis.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Key Metrics</h2>
            <KPICardGrid kpis={upload.insights_data.kpis} />
          </div>
        )}

        {/* Headline Chart */}
        {upload.insights_data &&
          upload.insights_data.headlineChart.seriesColumns.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {upload.insights_data.headlineChart.title}
              </h2>
              <ChartSwitcher
                data={upload.raw_data}
                config={upload.insights_data.headlineChart}
              />
            </div>
          )}

        {/* AI Summary (if available) */}
        {upload.ai_status === 'completed' && upload.ai_analysis && (
          <div>
            <h2 className="text-xl font-semibold mb-4">AI Summary</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-muted-foreground">
                {upload.ai_analysis.executiveSummary}
              </p>
            </div>
          </div>
        )}

        {/* Top 3 Insights */}
        {upload.insights_data && upload.insights_data.insights.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Top Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {upload.insights_data.insights.slice(0, 3).map((insight) => (
                <div
                  key={insight.id}
                  className="p-4 border rounded-lg bg-card"
                >
                  <h3 className="font-semibold text-sm mb-1">
                    {insight.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {insight.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* Charts Tab */}
      <TabsContent value="charts" className="space-y-6 mt-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Custom Chart</h2>
          <ColumnPicker
            sheetMeta={upload.sheet_meta}
            onChange={setCustomChartConfig}
            initialConfig={chartConfig}
          />
        </div>

        {chartConfig.yAxisColumns.length > 0 ? (
          <ChartSwitcher
            data={upload.raw_data}
            config={{
              chartType: chartConfig.chartType,
              xAxisColumn: chartConfig.xAxisColumn,
              seriesColumns: chartConfig.yAxisColumns,
              title: 'Custom Chart',
            }}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Select columns above to create a chart</p>
          </div>
        )}
      </TabsContent>

      {/* Data Tab */}
      <TabsContent value="data" className="mt-6">
        <DataTable
          data={upload.raw_data}
          headers={upload.sheet_meta.headers}
        />
      </TabsContent>

      {/* Insights Tab */}
      <TabsContent value="insights" className="mt-6">
        <AIInsightsPanel upload={upload} />
      </TabsContent>
    </Tabs>
  )
}
