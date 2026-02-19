/**
 * Insights engine test script
 *
 * Run with: npx tsx lib/insights/test.ts
 */

import { generateInsights } from './index'
import { SheetMeta } from '@/types'

function testInsights() {
  console.log('🧪 Testing SpreadDash Insights Engine...\n')

  // Create a predictable test dataset with clear trends
  const rawData = [
    { Date: '2025-01-01T00:00:00.000Z', Revenue: 1000, Expenses: 500, Profit: 500, Category: 'Electronics' },
    { Date: '2025-01-02T00:00:00.000Z', Revenue: 1100, Expenses: 520, Profit: 580, Category: 'Electronics' },
    { Date: '2025-01-03T00:00:00.000Z', Revenue: 1050, Expenses: 510, Profit: 540, Category: 'Home' },
    { Date: '2025-01-04T00:00:00.000Z', Revenue: 1200, Expenses: 530, Profit: 670, Category: 'Electronics' },
    { Date: '2025-01-05T00:00:00.000Z', Revenue: 1300, Expenses: 540, Profit: 760, Category: 'Home' },
    { Date: '2025-01-06T00:00:00.000Z', Revenue: 1400, Expenses: 550, Profit: 850, Category: 'Electronics' },
    { Date: '2025-01-07T00:00:00.000Z', Revenue: 1500, Expenses: 560, Profit: 940, Category: 'Home' },
    { Date: '2025-01-08T00:00:00.000Z', Revenue: 1600, Expenses: 570, Profit: 1030, Category: 'Electronics' },
    { Date: '2025-01-09T00:00:00.000Z', Revenue: 1700, Expenses: 580, Profit: 1120, Category: 'Home' },
    { Date: '2025-01-10T00:00:00.000Z', Revenue: 1800, Expenses: 590, Profit: 1210, Category: 'Electronics' },
  ]

  const sheetMeta: SheetMeta = {
    headers: ['Date', 'Revenue', 'Expenses', 'Profit', 'Category'],
    columns: [
      {
        index: 0,
        header: 'Date',
        detectedType: 'date',
        sampleValues: ['2025-01-01', '2025-01-02', '2025-01-03'],
        nullCount: 0,
        uniqueCount: 10,
        isPercentage: false,
      },
      {
        index: 1,
        header: 'Revenue',
        detectedType: 'number',
        sampleValues: ['1000', '1100', '1050'],
        nullCount: 0,
        uniqueCount: 10,
        isPercentage: false,
      },
      {
        index: 2,
        header: 'Expenses',
        detectedType: 'number',
        sampleValues: ['500', '520', '510'],
        nullCount: 0,
        uniqueCount: 10,
        isPercentage: false,
      },
      {
        index: 3,
        header: 'Profit',
        detectedType: 'number',
        sampleValues: ['500', '580', '540'],
        nullCount: 0,
        uniqueCount: 10,
        isPercentage: false,
      },
      {
        index: 4,
        header: 'Category',
        detectedType: 'category',
        sampleValues: ['Electronics', 'Home'],
        nullCount: 0,
        uniqueCount: 2,
        isPercentage: false,
      },
    ],
    dateColumnIndex: 0,
    numericColumnIndices: [1, 2, 3],
    categoryColumnIndices: [4],
    totalRows: 10,
    totalColumns: 5,
  }

  // Generate insights
  const result = generateInsights(rawData, sheetMeta)

  console.log('✅ Insights generated!\n')

  // Display KPIs
  console.log('📊 KPI Cards:')
  result.kpis.forEach((kpi) => {
    console.log(`  ${kpi.columnName}:`)
    console.log(`    Current: ${kpi.formattedCurrent}`)
    console.log(`    Previous: ${kpi.previousValue}`)
    console.log(`    Change: ${kpi.formattedChange} (${kpi.changeDirection})`)
    console.log(`    Sparkline: [${kpi.sparklineData.join(', ')}]`)
    console.log()
  })

  // Display trends
  console.log('📈 Trend Analysis:')
  result.trends.forEach((trend) => {
    console.log(`  ${trend.columnName}:`)
    console.log(`    Trend: ${trend.trend}`)
    console.log(`    Change: ${trend.changePercent.toFixed(1)}%`)
    console.log(`    First half mean: ${trend.firstHalfMean.toFixed(2)}`)
    console.log(`    Second half mean: ${trend.secondHalfMean.toFixed(2)}`)
    console.log(`    Stats: min=${trend.stats.min}, max=${trend.stats.max}, mean=${trend.stats.mean.toFixed(2)}, stdDev=${trend.stats.stdDev.toFixed(2)}`)
    console.log()
  })

  // Display insights
  console.log('💡 Auto-Recommendations:')
  result.insights.forEach((insight, idx) => {
    console.log(`  ${idx + 1}. [${insight.severity.toUpperCase()}] ${insight.title}`)
    console.log(`     ${insight.description}`)
    console.log(`     Type: ${insight.type}, Value: ${insight.value.toFixed(2)}`)
    console.log()
  })

  // Display headline chart config
  console.log('📊 Headline Chart:')
  console.log(`  Type: ${result.headlineChart.chartType}`)
  console.log(`  Title: ${result.headlineChart.title}`)
  console.log(`  X-Axis: ${result.headlineChart.xAxisColumn}`)
  console.log(`  Series: ${result.headlineChart.seriesColumns.join(', ')}`)
  console.log()

  // Verify expected behaviors
  console.log('🔍 Verification:')
  console.log(`  ✅ Generated ${result.kpis.length} KPI cards`)
  console.log(`  ✅ Generated ${result.trends.length} trend analyses`)
  console.log(`  ✅ Generated ${result.insights.length} insights (max 6)`)

  // Check for expected trends
  const revenueTrend = result.trends.find((t) => t.columnName === 'Revenue')
  console.log(`  ${revenueTrend?.trend === 'rising' ? '✅' : '❌'} Revenue detected as rising`)

  const expensesTrend = result.trends.find((t) => t.columnName === 'Expenses')
  console.log(`  ${expensesTrend?.trend === 'rising' ? '✅' : '❌'} Expenses detected as rising`)

  const profitTrend = result.trends.find((t) => t.columnName === 'Profit')
  console.log(`  ${profitTrend?.trend === 'rising' ? '✅' : '❌'} Profit detected as rising`)

  // Check headline chart
  console.log(`  ${result.headlineChart.chartType === 'line' ? '✅' : '❌'} Headline chart is line chart (date + multiple numeric)`)

  // Check for biggest mover insight
  const hasBiggestMover = result.insights.some((i) => i.type === 'biggest_mover_up')
  console.log(`  ${hasBiggestMover ? '✅' : '❌'} Generated "biggest mover up" insight`)

  console.log('\n🎉 Insights engine test completed!')
}

testInsights()
