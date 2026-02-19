import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { UploadRecord } from '@/types'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  header: {
    marginBottom: 25,
    borderBottom: '2pt solid #2563eb',
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
  },
  date: {
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 2,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // KPI Table
  kpiTable: {
    marginTop: 8,
  },
  kpiTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: '1pt solid #d1d5db',
  },
  kpiTableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: '1pt solid #e5e7eb',
  },
  kpiCell1: { width: '35%', fontSize: 9 },
  kpiCell2: { width: '25%', fontSize: 9 },
  kpiCell3: { width: '20%', fontSize: 9 },
  kpiCell4: { width: '20%', fontSize: 9 },
  kpiHeaderText: { fontWeight: 'bold', fontSize: 9 },
  trendUp: { color: '#16a34a' },
  trendDown: { color: '#dc2626' },
  trendFlat: { color: '#6b7280' },
  // AI Summary
  aiBox: {
    padding: 12,
    backgroundColor: '#eff6ff',
    border: '1pt solid #bfdbfe',
    borderRadius: 4,
  },
  aiTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1e40af',
  },
  aiText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: '#1f2937',
  },
  // Insights List
  insightsList: {
    marginTop: 6,
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 12,
  },
  insightNumber: {
    fontSize: 9,
    fontWeight: 'bold',
    marginRight: 8,
    color: '#2563eb',
  },
  insightText: {
    fontSize: 9,
    flex: 1,
    lineHeight: 1.4,
  },
  // Data Table
  dataTable: {
    marginTop: 8,
  },
  dataTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottom: '1pt solid #d1d5db',
  },
  dataTableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottom: '0.5pt solid #e5e7eb',
  },
  dataCell: {
    flex: 1,
    fontSize: 7,
    overflow: 'hidden',
  },
  dataHeaderCell: {
    flex: 1,
    fontSize: 8,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTop: '1pt solid #e5e7eb',
    paddingTop: 8,
  },
})

type PDFReportProps = {
  upload: UploadRecord
  reportLabel?: string
}

export default function PDFReport({ upload, reportLabel }: PDFReportProps) {
  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const timestamp = new Date().toISOString()

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SpreadDash</Text>
          <Text style={styles.subtitle}>
            {reportLabel || upload.label || upload.filename}
          </Text>
          <Text style={styles.date}>Generated on {reportDate}</Text>
        </View>

        {/* KPI Summary Table */}
        {upload.insights_data?.kpis && upload.insights_data.kpis.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>KPI Summary</Text>
            <View style={styles.kpiTable}>
              {/* Table Header */}
              <View style={styles.kpiTableHeader}>
                <Text style={[styles.kpiCell1, styles.kpiHeaderText]}>Metric</Text>
                <Text style={[styles.kpiCell2, styles.kpiHeaderText]}>Current Value</Text>
                <Text style={[styles.kpiCell3, styles.kpiHeaderText]}>Change</Text>
                <Text style={[styles.kpiCell4, styles.kpiHeaderText]}>Trend</Text>
              </View>
              {/* Table Rows */}
              {upload.insights_data.kpis.map((kpi, idx) => (
                <View key={idx} style={styles.kpiTableRow}>
                  <Text style={styles.kpiCell1}>{kpi.columnName}</Text>
                  <Text style={styles.kpiCell2}>{kpi.formattedCurrent}</Text>
                  <Text style={styles.kpiCell3}>{kpi.formattedChange}</Text>
                  <Text
                    style={[
                      styles.kpiCell4,
                      kpi.changeDirection === 'up'
                        ? styles.trendUp
                        : kpi.changeDirection === 'down'
                        ? styles.trendDown
                        : styles.trendFlat,
                    ]}
                  >
                    {kpi.changeDirection === 'up'
                      ? '↑ Rising'
                      : kpi.changeDirection === 'down'
                      ? '↓ Falling'
                      : '→ Stable'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* AI Executive Summary */}
        {upload.ai_analysis?.executiveSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Analysis</Text>
            <View style={styles.aiBox}>
              <Text style={styles.aiTitle}>Executive Summary</Text>
              <Text style={styles.aiText}>{upload.ai_analysis.executiveSummary}</Text>
            </View>
          </View>
        )}

        {/* Insights */}
        {upload.insights_data?.insights && upload.insights_data.insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insights</Text>
            <View style={styles.insightsList}>
              {upload.insights_data.insights.map((insight, idx) => (
                <View key={idx} style={styles.insightItem}>
                  <Text style={styles.insightNumber}>{idx + 1}.</Text>
                  <Text style={styles.insightText}>{insight.description}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Data Preview */}
        {upload.raw_data && upload.raw_data.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Preview (First 20 Rows)</Text>
            <View style={styles.dataTable}>
              {/* Table Header */}
              <View style={styles.dataTableHeader}>
                {upload.sheet_meta.headers.map((header, idx) => (
                  <Text key={idx} style={styles.dataHeaderCell}>
                    {header}
                  </Text>
                ))}
              </View>
              {/* Table Rows */}
              {upload.raw_data.slice(0, 20).map((row, rowIdx) => (
                <View key={rowIdx} style={styles.dataTableRow}>
                  {upload.sheet_meta.headers.map((header, cellIdx) => (
                    <Text key={cellIdx} style={styles.dataCell}>
                      {formatCellValue(row[header])}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated by SpreadDash • {timestamp}</Text>
        </View>
      </Page>
    </Document>
  )
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''

  // Date formatting
  if (value instanceof Date) {
    return value.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Number formatting
  if (typeof value === 'number') {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }

  // Truncate long strings
  const str = String(value)
  return str.length > 50 ? str.substring(0, 47) + '...' : str
}
