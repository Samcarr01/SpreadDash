import { z } from 'zod';

// ============================================================
// Column & Sheet Metadata
// ============================================================

export const ColumnTypeEnum = z.enum(['date', 'number', 'text', 'category']);
export type ColumnType = z.infer<typeof ColumnTypeEnum>;

export const ColumnMetaSchema = z.object({
  index: z.number().int().min(0),
  header: z.string(),
  detectedType: ColumnTypeEnum,
  sampleValues: z.array(z.string()).max(5),
  nullCount: z.number().int().min(0),
  uniqueCount: z.number().int().min(0),
  isPercentage: z.boolean().default(false),
});
export type ColumnMeta = z.infer<typeof ColumnMetaSchema>;

export const SheetMetaSchema = z.object({
  headers: z.array(z.string()),
  columns: z.array(ColumnMetaSchema),
  dateColumnIndex: z.number().int().nullable(),
  numericColumnIndices: z.array(z.number().int()),
  categoryColumnIndices: z.array(z.number().int()),
  totalRows: z.number().int().min(0),
  totalColumns: z.number().int().min(0),
});
export type SheetMeta = z.infer<typeof SheetMetaSchema>;

// ============================================================
// Parser Output
// ============================================================

export const ParseResultSchema = z.object({
  success: z.boolean(),
  data: z.object({
    raw_data: z.array(z.record(z.string(), z.unknown())),
    sheet_meta: SheetMetaSchema,
  }).nullable(),
  error: z.string().optional(),
  warnings: z.array(z.string()),
});
export type ParseResult = z.infer<typeof ParseResultSchema>;

// ============================================================
// Insights
// ============================================================

export const KPICardSchema = z.object({
  columnName: z.string(),
  columnIndex: z.number().int(),
  currentValue: z.number(),
  previousValue: z.number(),
  changePercent: z.number(),
  changeDirection: z.enum(['up', 'down', 'flat']),
  sparklineData: z.array(z.number()),
  formattedCurrent: z.string(),
  formattedChange: z.string(),
  isPercentageColumn: z.boolean(),
});
export type KPICard = z.infer<typeof KPICardSchema>;

export const TrendResultSchema = z.object({
  columnName: z.string(),
  columnIndex: z.number().int(),
  trend: z.enum(['rising', 'falling', 'flat', 'volatile', 'insufficient_data']),
  firstHalfMean: z.number(),
  secondHalfMean: z.number(),
  changePercent: z.number(),
  stats: z.object({
    min: z.number(),
    max: z.number(),
    mean: z.number(),
    median: z.number(),
    stdDev: z.number(),
  }),
});
export type TrendResult = z.infer<typeof TrendResultSchema>;

export const InsightTypeEnum = z.enum([
  'biggest_mover_up',
  'biggest_mover_down',
  'high_volatility',
  'flatline',
  'outlier',
  'correlation',
]);

export const InsightSeverityEnum = z.enum(['info', 'warning', 'positive', 'negative']);

export const InsightSchema = z.object({
  id: z.string(),
  type: InsightTypeEnum,
  severity: InsightSeverityEnum,
  title: z.string().max(60),
  description: z.string().max(200),
  relatedColumns: z.array(z.string()),
  value: z.number(),
});
export type Insight = z.infer<typeof InsightSchema>;

export const HeadlineChartConfigSchema = z.object({
  chartType: z.enum(['line', 'area', 'bar']),
  xAxisColumn: z.string(),
  seriesColumns: z.array(z.string()).max(5),
  title: z.string(),
});
export type HeadlineChartConfig = z.infer<typeof HeadlineChartConfigSchema>;

export const InsightsResultSchema = z.object({
  kpis: z.array(KPICardSchema),
  trends: z.array(TrendResultSchema),
  insights: z.array(InsightSchema).max(6),
  headlineChart: HeadlineChartConfigSchema,
  generatedAt: z.string().datetime(),
});
export type InsightsResult = z.infer<typeof InsightsResultSchema>;

// ============================================================
// AI Analysis (Claude Haiku)
// ============================================================

export const AIAnalysisResultSchema = z.object({
  executiveSummary: z.string().max(1000),
  keyTakeaways: z.array(z.string().max(150)).max(4).optional(),
  crossColumnPatterns: z.array(z.string().max(300)).max(3),
  actionItems: z.array(z.string().max(300)).max(3),
  quickWins: z.array(z.string().max(200)).max(3).optional(),
  nextSteps: z.array(z.string().max(200)).max(3).optional(),
  dataQualityConcerns: z.array(z.string().max(200)).max(5),
});
export type AIAnalysisResult = z.infer<typeof AIAnalysisResultSchema>;

export const AIStatusEnum = z.enum(['pending', 'completed', 'failed', 'skipped']);
export type AIStatus = z.infer<typeof AIStatusEnum>;

// ============================================================
// Database Records
// ============================================================

export const UploadStatusEnum = z.enum(['processing', 'processed', 'failed']);

export const UploadRecordSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  label: z.string().nullable(),
  uploaded_by: z.string().default('Team'),
  uploaded_at: z.string().datetime(),
  file_url: z.string().url(),
  file_size_bytes: z.number().int().positive(),
  row_count: z.number().int().min(0),
  column_count: z.number().int().min(0),
  raw_data: z.array(z.record(z.string(), z.unknown())),
  sheet_meta: SheetMetaSchema,
  insights_data: InsightsResultSchema.nullable(),
  ai_analysis: AIAnalysisResultSchema.nullable(),
  ai_status: AIStatusEnum,
  status: UploadStatusEnum,
});
export type UploadRecord = z.infer<typeof UploadRecordSchema>;

// Summary version without raw_data (for list views)
export const UploadSummarySchema = UploadRecordSchema.omit({
  raw_data: true,
  sheet_meta: true,
  insights_data: true,
});
export type UploadSummary = z.infer<typeof UploadSummarySchema>;

export const SavedReportSchema = z.object({
  id: z.string().uuid(),
  upload_id: z.string().uuid(),
  created_at: z.string().datetime(),
  pdf_url: z.string().url(),
  label: z.string().nullable(),
  file_size: z.number().int().nullable(),
});
export type SavedReport = z.infer<typeof SavedReportSchema>;

// ============================================================
// API Request/Response
// ============================================================

export const LoginRequestSchema = z.object({
  code: z.string().min(1).max(100),
});

export const ExportRequestSchema = z.object({
  uploadId: z.string().uuid(),
  label: z.string().max(200).optional(),
});

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ============================================================
// Auth
// ============================================================

export const SessionPayloadSchema = z.object({
  authenticated: z.literal(true),
  issuedAt: z.number().int(),
});
export type SessionPayload = z.infer<typeof SessionPayloadSchema>;

// ============================================================
// Chart Config (UI)
// ============================================================

export interface ChartConfig {
  xAxisColumn: string;
  yAxisColumns: string[];
  chartType: 'line' | 'bar' | 'area';
}

export const CHART_COLOURS = [
  '#2563eb', // blue-600
  '#16a34a', // green-600
  '#ea580c', // orange-600
  '#9333ea', // purple-600
  '#e11d48', // rose-600
  '#0891b2', // cyan-600
] as const;

export const TREND_COLOURS = {
  up: '#16a34a',
  down: '#dc2626',
  flat: '#6b7280',
} as const;

// ============================================================
// Validation Constants
// ============================================================

export const LIMITS = {
  MAX_UPLOAD_SIZE_BYTES: 25 * 1024 * 1024,  // 25 MB
  MAX_ROWS: 100_000,
  MAX_COLUMNS: 50,
  MAX_INSIGHTS: 6,
  SESSION_DURATION_SECONDS: 7 * 24 * 60 * 60,  // 7 days
  ALLOWED_EXTENSIONS: ['.xlsx', '.xls', '.csv'] as const,
  ALLOWED_MIME_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ] as const,
} as const;

export const THRESHOLDS = {
  TREND_CHANGE_PERCENT: 0.05,         // 5% change = rising/falling
  VOLATILITY_MULTIPLIER: 2,           // stdDev 2x = volatile
  CATEGORY_MAX_UNIQUE: 20,            // ≤20 unique values = category
  DATE_DETECTION_THRESHOLD: 0.7,      // 70% parseable = date column
  NUMBER_DETECTION_THRESHOLD: 0.8,    // 80% parseable = number column
  CORRELATION_THRESHOLD: 0.7,         // Pearson r > 0.7 = correlated
  OUTLIER_STDDEV_MULTIPLIER: 3,       // 3 stdDev from mean = outlier
  MIN_DATA_POINTS_FOR_TRENDS: 4,
  TYPE_SAMPLE_SIZE: 100,              // Check first 100 values for type detection
} as const;
