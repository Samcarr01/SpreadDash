/**
 * Parser test script
 *
 * Run with: npx tsx lib/parser/test.ts
 */

import { parseSpreadsheet } from './index'

async function testParser() {
  console.log('🧪 Testing SpreadDash Parser...\n')

  // Create a test CSV with various data types
  const testCSV = `Date,Revenue,Growth %,Category,Notes
2025-01-01,1234.56,12.5%,Electronics,Launch month
02/02/2025,2100.00,8.3%,Electronics,Strong sales
03/03/2025,1950.50,-7.1%,Home & Garden,Seasonal dip
15-Apr-25,2500,28.2%,Electronics,New product
2025-05-01,(150.00),-5.7%,Home & Garden,Returns processed
06/06/2025,3100.75,24%,Sports,Summer boost`

  const buffer = Buffer.from(testCSV, 'utf-8')

  const result = await parseSpreadsheet(buffer, 'test.csv')

  if (!result.success) {
    console.error('❌ Parse failed:', result.error)
    return
  }

  console.log('✅ Parse successful!\n')

  // Display sheet metadata
  console.log('📊 Sheet Metadata:')
  console.log('  Total Rows:', result.data!.sheet_meta.totalRows)
  console.log('  Total Columns:', result.data!.sheet_meta.totalColumns)
  console.log('  Date Column Index:', result.data!.sheet_meta.dateColumnIndex)
  console.log('  Numeric Column Indices:', result.data!.sheet_meta.numericColumnIndices)
  console.log('  Category Column Indices:', result.data!.sheet_meta.categoryColumnIndices)
  console.log()

  // Display column types
  console.log('📋 Detected Column Types:')
  result.data!.sheet_meta.columns.forEach((col) => {
    console.log(`  ${col.header}:`)
    console.log(`    Type: ${col.detectedType}`)
    console.log(`    Percentage: ${col.isPercentage}`)
    console.log(`    Unique Values: ${col.uniqueCount}`)
    console.log(`    Null Count: ${col.nullCount}`)
    console.log(`    Sample Values: ${col.sampleValues.slice(0, 3).join(', ')}`)
    console.log()
  })

  // Display normalized data
  console.log('📝 Normalized Data (first 3 rows):')
  result.data!.raw_data.slice(0, 3).forEach((row, idx) => {
    console.log(`  Row ${idx + 1}:`, JSON.stringify(row, null, 2))
  })
  console.log()

  // Display warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:')
    result.warnings.forEach((warning) => console.log(`  - ${warning}`))
  } else {
    console.log('✅ No warnings')
  }

  console.log('\n🎉 Parser test completed!')
}

testParser().catch(console.error)
