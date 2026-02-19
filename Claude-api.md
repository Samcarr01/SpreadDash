# API — Next.js Route Handlers

All server-side logic runs through Next.js App Router API routes. Every protected route validates the session cookie before processing. All responses are JSON with consistent error shapes.

## Features

### Shared Response Format

#### Constraints
- **All API routes must return this shape:**
```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string, code?: string }
```
- **HTTP status codes:** 200 success, 201 created, 400 bad request, 401 unauthorized, 413 payload too large, 429 rate limited, 500 server error
- **All routes must catch unhandled errors and return 500 with a generic message — never expose stack traces**

### POST /api/auth/login

#### Constraints
- **Validate body with Zod: `{ code: string }`**
- **Compare code against `ACCESS_CODE` env var using `crypto.timingSafeEqual`**
- **On success: set signed `sd_session` cookie and return `{ success: true }`**
- **On failure: return 401 `{ success: false, error: "Invalid access code" }`**
- **Rate limit: 5 attempts per IP per 15 minutes**

#### Flow
- Input: `{ code: "team-secret-123" }`
- Process: Validate → Compare timing-safe → Sign session → Set cookie
- Output: `{ success: true }` + `Set-Cookie: sd_session=...`

### POST /api/auth/logout

#### Constraints
- **Clear the `sd_session` cookie by setting `maxAge: 0`**
- **Return `{ success: true }`**
- **No auth check needed — clearing an invalid cookie is harmless**

### POST /api/upload

#### Constraints
- **Auth required (session cookie validated)**
- **Accept `multipart/form-data` with fields:** `file` (the spreadsheet), `label` (optional string), `uploadedBy` (optional string)
- **File validation:**
  - Max size: 25 MB
  - Allowed types: `.xlsx`, `.xls`, `.csv` (check both extension and MIME type)
  - Reject with 400 if invalid
- **Rate limit: 10 uploads per session per minute**
- **Processing pipeline:**
  1. Read file buffer from form data
  2. Upload original file to Supabase Storage at `originals/{uuid}/{filename}`
  3. Parse file using parser engine (see Claude-parser.md)
  4. If parse fails, return 400 with parser error message
  5. Run insights engine on parsed data (see Claude-insights.md)
  6. Insert record into `uploads` table with raw_data, sheet_meta, insights_data, `ai_status: 'pending'`
  7. Run AI analysis via Claude Haiku (see Claude-ai.md) — if ANTHROPIC_API_KEY is set
  8. On AI success: update record with ai_analysis + `ai_status: 'completed'`
  9. On AI failure/timeout: update record with `ai_status: 'failed'` (non-blocking)
  10. Return the created upload record

#### Flow
- Input: Multipart form with spreadsheet file
- Process: Validate → Store original → Parse → Analyse → AI → Save to DB
- Output: `{ success: true, data: { id, filename, label, uploaded_at, sheet_meta, insights_data, ai_analysis, ai_status } }`

### POST /api/uploads/[id]/analyse

#### Constraints
- **Auth required**
- **Retriggers AI analysis for an existing upload**
- **Rate limit: 3 retriggers per upload per hour**
- **Validate that the upload exists and has `raw_data` and `sheet_meta`**
- **If `ANTHROPIC_API_KEY` is not set, return 400 "AI analysis not configured"**

#### Flow
- Input: URL param `id` (UUID)
- Process: Fetch upload → Build AI prompt from sheet_meta + insights_data + data sample → Call Haiku → Validate response → Update record
- Output: `{ success: true, data: { ai_analysis, ai_status } }`

### GET /api/uploads

#### Constraints
- **Auth required**
- **Return all uploads, newest first**
- **Do NOT include `raw_data` in the list response — too large**
- **Include:** id, filename, label, uploaded_by, uploaded_at, row_count, column_count, status

#### Flow
- Input: No params (future: pagination with `?page=1&limit=20`)
- Process: Query `uploads` table, select summary fields, order by `uploaded_at DESC`
- Output: `{ success: true, data: Upload[] }`

### GET /api/uploads/[id]

#### Constraints
- **Auth required**
- **Return full upload record INCLUDING `raw_data`, `sheet_meta`, `insights_data`**
- **If ID not found, return 404**
- **Validate ID is a valid UUID format**

#### Flow
- Input: URL param `id` (UUID)
- Process: Validate UUID → Query by ID → Return full record
- Output: `{ success: true, data: Upload }` or 404

### POST /api/export

#### Constraints
- **Auth required**
- **Accept JSON body: `{ uploadId: string, label?: string }`**
- **Generate PDF using @react-pdf/renderer with current dashboard data**
- **PDF contents:** header with label and date, KPI cards grid, AI executive summary (if available), headline chart (as static image or table fallback), insights list, data summary table (first 20 rows)
- **Upload PDF to Supabase Storage at `reports/{upload_id}/{timestamp}.pdf`**
- **Insert record into `saved_reports` table**
- **Return the report record with `pdf_url`**

#### Flow
- Input: `{ uploadId: "uuid-here", label: "February Report" }`
- Process: Fetch upload data → Generate PDF → Upload to storage → Save report record
- Output: `{ success: true, data: { id, upload_id, pdf_url, created_at, label } }`

### Middleware (middleware.ts)

#### Constraints
- **Runs on every request at the edge**
- **Protected paths:** `/dashboard`, `/dashboard/*`, `/history`, `/api/upload`, `/api/uploads`, `/api/uploads/*`, `/api/export`
- **Unprotected paths:** `/`, `/api/auth/*`, `/_next/*`, `/favicon.ico`
- **On invalid session → redirect to `/` for page routes, return 401 for API routes**

#### Flow
- Input: Incoming request
- Process: Check path against protected list → If protected, verify `sd_session` cookie → If API route, return 401 JSON; if page route, redirect to `/`
- Output: NextResponse.next() or redirect/error

## Error Handling Patterns

```typescript
// Consistent error wrapper for all API routes
async function handleApiRoute(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    console.error('[API Error]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Validation Schemas

```typescript
const UploadQuerySchema = z.object({
  id: z.string().uuid(),
});

const ExportRequestSchema = z.object({
  uploadId: z.string().uuid(),
  label: z.string().max(200).optional(),
});
```
