/**
 * AI analysis test script
 *
 * Run with: npx tsx lib/ai/test.ts
 */

import { analyseWithAI } from './index'
import { SheetMeta, InsightsResult } from '@/types'

async function testAI() {
  console.log('🧪 Testing Claude Haiku AI Analysis...\n')

  // Check if API key is set
  const hasAPIKey = !!process.env.ANTHROPIC_API_KEY
  console.log(`API Key configured: ${hasAPIKey ? '✅ Yes' : '❌ No'}\n`)

  // Create test data (same as insights test)
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

  const insightsResult: InsightsResult = {
    kpis: [
      {
        columnName: 'Revenue',
        columnIndex: 1,
        currentValue: 1800,
        previousValue: 1700,
        changePercent: 5.9,
        changeDirection: 'up',
        sparklineData: [1000, 1100, 1050, 1200, 1300, 1400, 1500, 1600, 1700, 1800],
        formattedCurrent: '1,800',
        formattedChange: '+5.9%',
        isPercentageColumn: false,
      },
      {
        columnName: 'Profit',
        columnIndex: 3,
        currentValue: 1210,
        previousValue: 1120,
        changePercent: 8.0,
        changeDirection: 'up',
        sparklineData: [500, 580, 540, 670, 760, 850, 940, 1030, 1120, 1210],
        formattedCurrent: '1,210',
        formattedChange: '+8.0%',
        isPercentageColumn: false,
      },
    ],
    trends: [
      {
        columnName: 'Revenue',
        columnIndex: 1,
        trend: 'rising',
        firstHalfMean: 1130,
        secondHalfMean: 1600,
        changePercent: 41.6,
        stats: { min: 1000, max: 1800, mean: 1365, median: 1350, stdDev: 266.51 },
      },
      {
        columnName: 'Profit',
        columnIndex: 3,
        trend: 'rising',
        firstHalfMean: 610,
        secondHalfMean: 1030,
        changePercent: 68.9,
        stats: { min: 500, max: 1210, mean: 820, median: 805, stdDev: 237.91 },
      },
    ],
    insights: [
      {
        id: 'insight-0',
        type: 'biggest_mover_up',
        severity: 'positive',
        title: 'Profit showing strong growth',
        description: 'Profit increased by 68.9% in the second half of the period (610.00 → 1030.00)',
        relatedColumns: ['Profit'],
        value: 68.85,
      },
    ],
    headlineChart: {
      chartType: 'line',
      xAxisColumn: 'Date',
      seriesColumns: ['Profit', 'Revenue', 'Expenses'],
      title: 'Trends Over Time',
    },
    generatedAt: new Date().toISOString(),
  }

  console.log('🔄 Calling Claude Haiku API...\n')

  const result = await analyseWithAI(sheetMeta, insightsResult, rawData)

  if (!result) {
    console.log('❌ AI analysis returned null\n')
    if (!hasAPIKey) {
      console.log('✅ Expected behavior - no API key configured')
    } else {
      console.log('⚠️  Unexpected - API key is configured but analysis failed')
      console.log('   Check the error logs above for details')
    }
  } else {
    console.log('✅ AI analysis successful!\n')

    console.log('📝 Executive Summary:')
    console.log(`   ${result.executiveSummary}\n`)

    console.log('🔍 Cross-Column Patterns:')
    result.crossColumnPatterns.forEach((pattern, idx) => {
      console.log(`   ${idx + 1}. ${pattern}`)
    })
    console.log()

    console.log('✨ Action Items:')
    result.actionItems.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item}`)
    })
    console.log()

    if (result.dataQualityConcerns.length > 0) {
      console.log('⚠️  Data Quality Concerns:')
      result.dataQualityConcerns.forEach((concern, idx) => {
        console.log(`   ${idx + 1}. ${concern}`)
      })
      console.log()
    } else {
      console.log('✅ No data quality concerns\n')
    }

    // Validate field lengths
    const summaryLength = result.executiveSummary.length
    const patternsValid = result.crossColumnPatterns.every(p => p.length <= 300)
    const itemsValid = result.actionItems.every(i => i.length <= 300)
    const concernsValid = result.dataQualityConcerns.every(c => c.length <= 200)

    console.log('🔍 Validation:')
    console.log(`   ${summaryLength <= 1000 ? '✅' : '❌'} Summary length: ${summaryLength}/1000 chars`)
    console.log(`   ${patternsValid ? '✅' : '❌'} Patterns within limits (max 300 chars each)`)
    console.log(`   ${itemsValid ? '✅' : '❌'} Action items within limits (max 300 chars each)`)
    console.log(`   ${concernsValid ? '✅' : '❌'} Concerns within limits (max 200 chars each)`)
    console.log(`   ${result.crossColumnPatterns.length <= 3 ? '✅' : '❌'} Patterns count: ${result.crossColumnPatterns.length}/3 max`)
    console.log(`   ${result.actionItems.length <= 3 ? '✅' : '❌'} Action items count: ${result.actionItems.length}/3 max`)
    console.log(`   ${result.dataQualityConcerns.length <= 5 ? '✅' : '❌'} Concerns count: ${result.dataQualityConcerns.length}/5 max`)
  }

  console.log('\n🎉 AI analysis test completed!')
}

testAI().catch((error) => {
  console.error('Test failed with error:', error)
  process.exit(1)
})
