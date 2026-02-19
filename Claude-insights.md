# Insights — Trend Detection and Auto-Recommendations

Rule-based analysis engine that examines parsed numeric data and generates human-readable insights, KPI summaries and actionable recommendations. No AI/LLM calls — purely deterministic logic so identical data always produces identical insights.

## Features

### KPI Extraction

#### Constraints
- **Generate one KPI card per numeric column**
- **Each KPI card must include:** column name, current value (last row), previous value (second-to-last row), percentage change, trend direction (up/down/flat)
- **If a date column exists, "current" = most recent date's value, "previous" = second most recent**
- **If no date column, "current" = last row, "previous" = second-to-last row**
- *Format numbers with appropriate precision: integers for counts, 2 decimal places for currency/percentages*
- *Include sparkline data: last 10 values for the mini trend line on each card*

#### Output Shape
```typescript
interface KPICard {
  columnName: string;
  columnIndex: number;
  currentValue: number;
  previousValue: number;
  changePercent: number;          // e.g. 12.5 for +12.5%
  changeDirection: 'up' | 'down' | 'flat';
  sparklineData: number[];        // Last 10 values
  formattedCurrent: string;       // e.g. "£12,450" or "34.2%"
  formattedChange: string;        // e.g. "+12.5%"
  isPercentageColumn: boolean;
}
```

### Trend Detection

#### Constraints
- **Split the dataset in half (first half vs second half by row order)**
- **Calculate the mean of each half for every numeric column**
- **Classification rules:**
  - `rising`: second half mean is >5% higher than first half mean
  - `falling`: second half mean is >5% lower than first half mean
  - `flat`: change is within ±5%
  - `volatile`: standard deviation of second half is >2x the standard deviation of first half
- **Also calculate:** overall min, max, mean, median, standard deviation per numeric column
- *If fewer than 4 data points, mark trend as `insufficient_data`*

#### Output Shape
```typescript
interface TrendResult {
  columnName: string;
  columnIndex: number;
  trend: 'rising' | 'falling' | 'flat' | 'volatile' | 'insufficient_data';
  firstHalfMean: number;
  secondHalfMean: number;
  changePercent: number;
  stats: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  };
}
```

### Auto-Recommendations

#### Constraints
- **Generate 3–6 insight bullets per upload, ranked by significance**
- **Each insight must reference the specific column name and concrete numbers**
- **Rule set:**
  1. **Biggest mover up**: Column with highest positive % change → "Revenue increased by 23% in the second half of the period"
  2. **Biggest mover down**: Column with largest negative % change → "Customer churn rate dropped by 15%"
  3. **Highest volatility**: Column with highest stdDev relative to mean → "Ad spend shows high variability (CV: 0.45) — consider investigating"
  4. **Flatline alert**: Column that is `flat` with very low stdDev → "Conversion rate has remained stable at ~3.2%"
  5. **Outlier detection**: Any single value >3 standard deviations from the mean → "Spike detected in row 24: Revenue hit £45,000 vs average of £12,000"
  6. **Correlation hint**: If two numeric columns move in the same direction with >0.7 Pearson correlation → "Marketing spend and new signups appear correlated (r=0.82)"
- **Never generate insights for columns with fewer than 4 data points**
- *Insights must be written in plain business English, not technical jargon*

#### Output Shape
```typescript
interface Insight {
  id: string;                           // Unique ID for UI keys
  type: 'biggest_mover_up' | 'biggest_mover_down' | 'high_volatility' | 'flatline' | 'outlier' | 'correlation';
  severity: 'info' | 'warning' | 'positive' | 'negative';
  title: string;                        // Short headline (max 60 chars)
  description: string;                  // Full insight text (max 200 chars)
  relatedColumns: string[];             // Column names referenced
  value: number;                        // Primary metric (% change, correlation etc.)
}
```

### Headline Chart Selection

#### Constraints
- **Auto-select the "best" chart for the Overview tab**
- **Selection logic:**
  1. If a date column exists + ≥2 numeric columns → Line chart with date as X axis and top 3 movers as series
  2. If a date column exists + 1 numeric column → Area chart
  3. If no date column + category column exists → Bar chart grouped by category
  4. If only numeric columns → Bar chart comparing latest values
- **Return the chart config so the UI can render without additional logic**

#### Output Shape
```typescript
interface HeadlineChartConfig {
  chartType: 'line' | 'area' | 'bar';
  xAxisColumn: string;
  seriesColumns: string[];              // Max 5 series
  title: string;                        // Auto-generated chart title
}
```

### Complete Insights Output

#### Constraints
- **All insights must be computed synchronously during the upload processing pipeline**
- **Store the full result in `uploads.insights_data` JSONB column**
- **If computation fails, still save the upload — just set `insights_data` to null and log the error**

#### Output Shape
```typescript
interface InsightsResult {
  kpis: KPICard[];
  trends: TrendResult[];
  insights: Insight[];
  headlineChart: HeadlineChartConfig;
  generatedAt: string;                  // ISO timestamp
}
```

## Determinism Guarantee

This engine is fully deterministic. Given the same `raw_data` and `sheet_meta`, it always produces the same `InsightsResult`. No randomness, no LLM calls, no external API dependencies. This makes testing straightforward: snapshot the input and assert the output matches exactly.
