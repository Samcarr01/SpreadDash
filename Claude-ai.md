# AI Analysis — Claude Haiku Narrative Layer

Optional AI-powered analysis that runs on top of the deterministic insights engine. Uses Claude Haiku to generate natural language summaries, cross-column interpretations and actionable recommendations that go beyond what rule-based logic can detect. The rule-based engine remains the foundation — AI adds a narrative layer.

## Architecture

```
Upload → Parser → Rule-Based Insights (always runs, instant, free)
                       ↓
              AI Analysis (async, Haiku API call)
                       ↓
              Merged result saved to uploads.insights_data
```

The dashboard renders immediately with rule-based KPIs, trends and charts. The AI summary appears once the Haiku call resolves (typically 1–3 seconds). If the AI call fails, the dashboard still works perfectly — the AI panel just shows a fallback message.

## Features

### AI Summary Generation

#### Constraints
- **Use Claude Haiku (`claude-haiku-4-5-20251001`) via the Anthropic API**
- **API key stored as `ANTHROPIC_API_KEY` environment variable — never in code**
- **Never send raw_data to the AI — send only sheet_meta + rule-based insights + a data sample**
- **Data sample: first 30 rows and last 10 rows (to show start and end of dataset)**
- **Max input tokens: keep prompt under 4,000 tokens to stay fast and cheap**
- **Max output tokens: 1,024**
- **Temperature: 0 (maximise consistency)**
- **Timeout: 15 seconds — if Haiku doesn't respond, fail gracefully**

#### System Prompt
```text
You are a data analyst reviewing a spreadsheet upload for an internal business team. You receive:
1. Column metadata (names, types, sample values)
2. Pre-computed statistics (KPIs, trends, correlations)
3. A sample of the actual data (first 30 rows, last 10 rows)

Your job:
- Write a 3–5 sentence executive summary of what the data shows
- Identify 2–3 cross-column patterns the rule-based engine might miss
- Suggest 2–3 specific, actionable next steps the team should consider
- Flag any data quality concerns (missing values, suspicious outliers, inconsistent formatting)

Rules:
- Be specific — reference actual column names and numbers
- Write in plain business English, not technical jargon
- Be concise — the team is busy
- If the data is too limited to draw conclusions, say so honestly
- Never invent data points that aren't in the provided sample
- Respond in valid JSON matching the required schema
```

#### User Prompt Construction
```typescript
function buildAnalysisPrompt(
  sheetMeta: SheetMeta,
  insightsResult: InsightsResult,
  dataSample: Record<string, unknown>[]
): string {
  return `
## Sheet Overview
- ${sheetMeta.totalRows} rows, ${sheetMeta.totalColumns} columns
- Columns: ${sheetMeta.headers.join(', ')}
- Date column: ${sheetMeta.dateColumnIndex !== null ? sheetMeta.headers[sheetMeta.dateColumnIndex] : 'None'}
- Numeric columns: ${sheetMeta.numericColumnIndices.map(i => sheetMeta.headers[i]).join(', ')}

## Pre-Computed KPIs
${insightsResult.kpis.map(k => `- ${k.columnName}: ${k.formattedCurrent} (${k.formattedChange})`).join('\n')}

## Detected Trends
${insightsResult.trends.map(t => `- ${t.columnName}: ${t.trend} (${t.changePercent.toFixed(1)}% change)`).join('\n')}

## Rule-Based Insights
${insightsResult.insights.map(i => `- [${i.type}] ${i.description}`).join('\n')}

## Data Sample (first 30 rows)
${JSON.stringify(dataSample.slice(0, 30), null, 0)}

## Data Sample (last 10 rows)
${JSON.stringify(dataSample.slice(-10), null, 0)}

Respond with valid JSON matching this schema:
{
  "executiveSummary": "string (3-5 sentences)",
  "crossColumnPatterns": ["string", "string"],
  "actionItems": ["string", "string"],
  "dataQualityConcerns": ["string"] or []
}
`;
}
```

#### Flow
- Input: SheetMeta + InsightsResult + data sample (first 30 + last 10 rows)
- Process: Build prompt → Call Haiku API → Parse JSON response → Validate with Zod
- On success: Return `AIAnalysisResult`
- On failure (timeout, parse error, API error): Return `null` and log the error
- Output: Validated `AIAnalysisResult` or `null`

### Async Processing Pattern

#### Constraints
- **AI analysis runs asynchronously after the upload is saved**
- **The upload API route flow becomes:**
  1. Parse file (sync, fast)
  2. Generate rule-based insights (sync, fast)
  3. Save upload to DB with `ai_status: 'pending'` (immediate response to user)
  4. Trigger AI analysis in background
  5. On AI completion: update the upload record with `ai_analysis` data and `ai_status: 'completed'`
- **The dashboard polls for AI status or uses a simple refetch after 3 seconds**
- **If AI fails: set `ai_status: 'failed'` — dashboard shows rule-based insights only**
- *Alternative to polling: return the upload immediately, let the dashboard page fetch AI results on a short delay*

#### Simplified Approach (v1)
For v1, keep it simple: run the AI call inline during upload processing. The upload takes 2–4 seconds longer but the implementation is much simpler. No background jobs, no polling, no status field.

```
Upload → Parse (instant) → Rule insights (instant) → AI call (1-3s) → Save all → Return
```

If the AI call times out (15s limit), save without AI data and move on. The dashboard handles `ai_analysis: null` gracefully.

### Token Budget Management

#### Constraints
- **Total prompt must stay under 4,000 input tokens**
- **If the data sample exceeds 2,500 tokens, truncate columns:**
  1. Keep all date columns
  2. Keep top 5 numeric columns by absolute change percent
  3. Drop text columns entirely from the sample
  4. Reduce to first 15 rows + last 5 rows
- **Never send the full raw_data — always sample**
- **Strip unnecessary whitespace from the JSON data sample**

#### Cost Estimate
```
Average input: ~3,000 tokens × $0.80/1M = $0.0024 per upload
Average output: ~500 tokens × $4.00/1M = $0.002 per upload
Total per upload: ~$0.004 (less than half a penny)
100 uploads/month: ~$0.40/month
```

### Response Validation

#### Constraints
- **Parse Haiku's response as JSON**
- **Validate against `AIAnalysisResultSchema` (Zod)**
- **If JSON parsing fails: try extracting JSON from markdown code fences (Haiku sometimes wraps in ```json)**
- **If validation fails: log the raw response, return null**
- **Never display unvalidated AI output to the user**

### Error Handling

#### Constraints
- **All AI failures are non-fatal — the app works perfectly without AI**
- **Error scenarios and responses:**
  - API key missing → Skip AI analysis entirely, log warning at startup
  - API timeout (>15s) → Return null, log timeout
  - Rate limited (429) → Return null, log rate limit hit
  - Invalid JSON response → Return null, log raw response
  - Zod validation failure → Return null, log validation errors
- **Never retry automatically — one shot per upload. User can manually retrigger from the dashboard.**
- *Display a subtle "AI analysis unavailable" badge in the UI when ai_analysis is null*

### Manual Retrigger

#### Constraints
- **Add a "Regenerate AI Analysis" button on the Insights tab**
- **Only visible when `ai_analysis` is null or user wants a fresh analysis**
- **Calls `POST /api/uploads/[id]/analyse` which re-runs the AI pipeline and updates the record**
- **Show loading spinner during regeneration**
- **Rate limit: 3 retriggers per upload per hour**

## Types

```typescript
export const AIAnalysisResultSchema = z.object({
  executiveSummary: z.string().max(1000),
  crossColumnPatterns: z.array(z.string().max(300)).max(3),
  actionItems: z.array(z.string().max(300)).max(3),
  dataQualityConcerns: z.array(z.string().max(200)).max(5),
});
export type AIAnalysisResult = z.infer<typeof AIAnalysisResultSchema>;

export const AIStatusEnum = z.enum(['pending', 'completed', 'failed', 'skipped']);
export type AIStatus = z.infer<typeof AIStatusEnum>;
```

## File Structure

```
/lib/ai/
  ├── index.ts              ← Main analyseWithAI(sheetMeta, insights, rawData) function
  ├── promptBuilder.ts      ← Constructs system + user prompt with token budget
  └── responseParser.ts     ← JSON extraction, Zod validation, error handling
```

## Privacy and Data Handling

- **Data sent to Anthropic API is subject to Anthropic's API data policy (not used for training by default)**
- **Only column headers, stats and a small data sample leave your server — never the full dataset**
- **If the team handles sensitive data (PII, financial records), add a toggle to disable AI analysis per upload**
- **The AI analysis feature can be globally disabled by omitting the `ANTHROPIC_API_KEY` env var — the app detects this and skips the AI layer entirely**
