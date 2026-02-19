# Build Chain — Sequential Execution Prompts

Run these prompts in order inside Claude Code. Each prompt builds on the previous step's output. After each step, verify the output before moving to the next.

---

## Step 1: Project Bootstrap + Types

🧠 CONTEXT:
CLAUDE.md → Folder Structure, Tech Stack
Claude-db.md → Schema shapes
Claude-parser.md → ParseResult, SheetMeta, ColumnMeta
Claude-insights.md → All output shapes (KPICard, TrendResult, Insight, etc.)

📋 TASK:
1. Initialise a Next.js 14 project with App Router, TypeScript, Tailwind CSS
2. Install dependencies: `xlsx`, `recharts`, `@react-pdf/renderer`, `zod`, `jose`, `@supabase/supabase-js`, `@anthropic-ai/sdk`
3. Install and initialise shadcn/ui with these components: button, card, input, label, tabs, table, badge, dropdown-menu, dialog, skeleton, toast, progress, separator, select, tooltip
4. Create `/types/index.ts` with ALL TypeScript interfaces and Zod schemas defined across the module files
5. Create `.env.local` template with all required environment variables

⚠️ CONSTRAINTS:
- Use `pnpm` as package manager
- Strict TypeScript (`strict: true` in tsconfig)
- All types must be exported from a single `types/index.ts` barrel file
- Zod schemas must mirror TypeScript interfaces exactly

📝 FORMAT:
Return complete file tree with all generated files.

✅ CHECKPOINT:
`pnpm build` passes with no type errors.

---

## Step 2: Supabase Setup

🧠 CONTEXT:
Claude-db.md → Full schema, storage bucket, RLS policies

📋 TASK:
1. Create `/lib/supabase/client.ts` — browser Supabase client using `NEXT_PUBLIC_` keys
2. Create `/lib/supabase/server.ts` — server Supabase client using `SUPABASE_SERVICE_ROLE_KEY`
3. Create SQL migration file with all tables, indexes, RLS policies and storage bucket setup
4. Document the migration in a `/supabase/migrations/001_initial_schema.sql` file

⚠️ CONSTRAINTS:
- Server client must use service role key and must never be imported in client components
- Add a comment block at the top of each file explaining its purpose
- Client file uses `createBrowserClient`, server file uses `createClient` with service role

📝 FORMAT:
Return the Supabase client files and the SQL migration file.

✅ CHECKPOINT:
Migration runs successfully in Supabase Dashboard. Both clients initialise without errors.

---

## Step 3: Auth System

🧠 CONTEXT:
Claude-auth.md → Full auth spec
Claude-api.md → POST /api/auth/login, POST /api/auth/logout, middleware

📋 TASK:
1. Create `/lib/auth.ts` — session helpers: `createSession()`, `verifySession()`, `clearSession()`
2. Create `/app/api/auth/login/route.ts` — access code verification + cookie setting
3. Create `/app/api/auth/logout/route.ts` — cookie clearing
4. Create `/middleware.ts` — route protection logic
5. Create `/components/layout/AuthGuard.tsx` — client-side session check wrapper

⚠️ CONSTRAINTS:
- Use `jose` for JWT signing (edge-compatible, unlike jsonwebtoken)
- Timing-safe comparison using `crypto.timingSafeEqual` with Buffer conversion
- Cookie settings: httpOnly, secure (production), sameSite strict, path /, maxAge 7 days
- Middleware must use `NextResponse.next()` and `NextResponse.redirect()`

📝 FORMAT:
Return all auth files. Include inline comments explaining security decisions.

✅ CHECKPOINT:
Can enter access code on login page → get session cookie → access /dashboard → logout → redirected to /.

---

## Step 4: Parser Engine

🧠 CONTEXT:
Claude-parser.md → Full parser spec with all detection rules and edge cases

📋 TASK:
1. Create `/lib/parser/index.ts` — main `parseSpreadsheet(buffer: Buffer, filename: string): Promise<ParseResult>` function
2. Create `/lib/parser/columnDetector.ts` — column type classification logic
3. Create `/lib/parser/sheetNormaliser.ts` — header detection, date normalisation, number normalisation

⚠️ CONSTRAINTS:
- Import SheetJS as `import * as XLSX from 'xlsx'`
- All parsing must happen synchronously after the initial buffer read
- Return warnings array for non-fatal issues (don't throw)
- Handle all edge cases listed in Claude-parser.md
- UK date format preferred for ambiguous dates

📝 FORMAT:
Return the three parser files with full implementation logic.

✅ CHECKPOINT:
Write a simple test: parse a sample CSV string, verify output shape matches `ParseResult`. Column types detected correctly. Dates normalised to ISO.

---

## Step 5: Insights Engine

🧠 CONTEXT:
Claude-insights.md → Full insights spec with all rules, thresholds and output shapes

📋 TASK:
1. Create `/lib/insights/index.ts` — main `generateInsights(rawData, sheetMeta): InsightsResult` function
2. Create `/lib/insights/trendDetector.ts` — trend classification + statistics calculation
3. Create `/lib/insights/recommendations.ts` — rule-based insight generation + correlation detection

⚠️ CONSTRAINTS:
- Fully deterministic — no randomness, no external calls
- All thresholds must be named constants at the top of the file (e.g. `TREND_THRESHOLD = 0.05`)
- Pearson correlation calculation must handle division by zero gracefully
- Insights sorted by significance (highest absolute change first)
- Max 6 insights returned

📝 FORMAT:
Return the three insights files with full implementation.

✅ CHECKPOINT:
Pass in a known dataset with predictable trends. Verify KPIs, trends and insights match expected values. Same input always produces same output.

---

## Step 5b: AI Analysis Layer

🧠 CONTEXT:
Claude-ai.md → Full AI layer spec (system prompt, prompt construction, response validation, error handling)
Claude-types.md → AIAnalysisResult, AIStatus schemas

📋 TASK:
1. Install `@anthropic-ai/sdk` dependency
2. Create `/lib/ai/index.ts` — main `analyseWithAI(sheetMeta, insightsResult, rawData): Promise<AIAnalysisResult | null>` function
3. Create `/lib/ai/promptBuilder.ts` — builds system prompt + user prompt with token budget management
4. Create `/lib/ai/responseParser.ts` — extracts JSON from Haiku response, validates with Zod, handles code fences

⚠️ CONSTRAINTS:
- Use `@anthropic-ai/sdk` (official Anthropic SDK)
- Model: `claude-haiku-4-5-20251001`
- Temperature: 0
- Max output tokens: 1024
- Timeout: 15 seconds
- If `ANTHROPIC_API_KEY` env var is missing, `analyseWithAI` must return null immediately (no error)
- Data sample sent to Haiku: first 30 rows + last 10 rows, truncated if over token budget
- All failures are non-fatal — always return null on error, never throw
- Log all errors with `[AI Analysis]` prefix for debugging

📝 FORMAT:
Return all three AI lib files with full implementation.

✅ CHECKPOINT:
Call `analyseWithAI()` with a sample dataset. Verify: returns valid AIAnalysisResult with executive summary, patterns, action items. Remove API key from env and verify it returns null without errors.

---

## Step 6: API Routes

🧠 CONTEXT:
Claude-api.md → All route specs
Claude-ai.md → AI integration in upload pipeline + analyse endpoint
Steps 2–5b outputs (Supabase clients, auth helpers, parser, insights engine, AI layer)

📋 TASK:
1. Create `/app/api/upload/route.ts` — file upload, parse, analyse, AI, save pipeline
2. Create `/app/api/uploads/route.ts` — list all uploads (summary only)
3. Create `/app/api/uploads/[id]/route.ts` — get single upload with full data
4. Create `/app/api/uploads/[id]/analyse/route.ts` — retrigger AI analysis for existing upload
5. Create `/app/api/export/route.ts` — generate and save PDF report

⚠️ CONSTRAINTS:
- Every route must validate session using `verifySession()` from `/lib/auth.ts`
- Every route must use the `handleApiRoute` error wrapper
- Upload route must validate file size and type before any processing
- Upload route must handle the full pipeline: store file → parse → insights → AI analysis → save record
- Upload route must call `analyseWithAI()` after rule-based insights. If it returns null, set `ai_status: 'failed'` or `'skipped'`
- Analyse route must rate limit to 3 retriggers per upload per hour
- Export route saves PDF to Supabase Storage and creates a `saved_reports` record
- All request bodies validated with Zod

📝 FORMAT:
Return all four route files with full implementation.

✅ CHECKPOINT:
Test upload with a real .xlsx file via curl or Postman. Verify: file stored in Supabase Storage, record created in uploads table with raw_data + sheet_meta + insights_data. GET /api/uploads returns the list. GET /api/uploads/[id] returns full record.

---

## Step 7: UI Components

🧠 CONTEXT:
Claude-ui.md → All component specs, design principles, colour palette

📋 TASK:
1. Create all chart components: `LineChartCard.tsx`, `BarChartCard.tsx`, `AreaChartCard.tsx`, `ChartSwitcher.tsx`
2. Create dashboard components: `KPICardGrid.tsx`, `InsightPanel.tsx`, `DashboardTabs.tsx`, `DataTable.tsx`, `ColumnPicker.tsx`, `AISummaryCard.tsx`, `AIInsightsPanel.tsx`
3. Create upload components: `DropZone.tsx`, `UploadProgress.tsx`
4. Create layout components: `Sidebar.tsx`, `TopBar.tsx`

⚠️ CONSTRAINTS:
- Chart components receive data via props — no data fetching inside
- All components use Tailwind classes — no CSS modules or inline styles
- Use the defined colour palette for charts and trends
- DropZone must validate file type and size client-side before upload
- DataTable must be virtualised or paginated for large datasets (>1000 rows)
- All interactive components must be marked `'use client'`
- AISummaryCard shows executive summary with "AI-generated" badge; handles null/pending/failed states gracefully
- AIInsightsPanel shows cross-column patterns, action items, data quality concerns; includes "Regenerate" button

📝 FORMAT:
Return all component files. Group by folder.

✅ CHECKPOINT:
Each component renders in isolation with mock data. No TypeScript errors. Responsive at desktop and tablet breakpoints.

---

## Step 8: Pages

🧠 CONTEXT:
Claude-ui.md → Page specs and layouts
All components from Step 7

📋 TASK:
1. Create `/app/page.tsx` — login page
2. Create `/app/dashboard/layout.tsx` — dashboard shell with sidebar
3. Create `/app/dashboard/page.tsx` — upload list + new upload zone
4. Create `/app/dashboard/[id]/page.tsx` — sheet dashboard with 4 tabs
5. Create `/app/history/page.tsx` — upload history table
6. Create `/app/layout.tsx` — root layout with font, metadata, Toaster

⚠️ CONSTRAINTS:
- Login page and root layout are server components
- Dashboard pages use server components for data fetching + client component children for interactivity
- `/dashboard/[id]/page.tsx` fetches data server-side, passes to client tab components
- Loading states: use `loading.tsx` files for each route segment
- Error states: use `error.tsx` files for each route segment

📝 FORMAT:
Return all page files plus loading.tsx and error.tsx files.

✅ CHECKPOINT:
Full user flow works: login → see uploads → upload new file → view dashboard with all 4 tabs → navigate to history → export PDF.

---

## Step 9: PDF Export

🧠 CONTEXT:
Claude-ui.md → PDFReport component spec
Claude-api.md → POST /api/export spec

📋 TASK:
1. Create `/components/export/PDFReport.tsx` — @react-pdf/renderer document component
2. Wire the export button in TopBar to trigger PDF generation via `/api/export`
3. Show toast notification on export success with download link

⚠️ CONSTRAINTS:
- PDF layout: A4 portrait
- Header: SpreadDash branding, report label, generation date
- Body: KPI summary table, insights list, first 20 rows of data
- No charts in PDF (v1) — text and tables only
- Footer: "Generated by SpreadDash" + timestamp

📝 FORMAT:
Return the PDF component and updated export route if changes are needed.

✅ CHECKPOINT:
Export a dashboard as PDF. Open the PDF. All data renders correctly. PDF is saved to Supabase Storage and linked in saved_reports table.

---

## Step 10: Polish and Deploy

🧠 CONTEXT:
All previous steps complete

📋 TASK:
1. Add `loading.tsx` skeleton screens for all route segments
2. Add `error.tsx` error boundaries for all route segments
3. Add proper `<head>` metadata (title, description, favicon)
4. Run `pnpm build` and fix any errors
5. Test the full flow end-to-end
6. Create a `README.md` with: project overview, setup instructions, environment variables, deployment steps

⚠️ CONSTRAINTS:
- Zero TypeScript errors
- Zero console warnings in production build
- All environment variables documented
- Vercel deployment config: no special settings needed (Next.js auto-detected)

📝 FORMAT:
Return any new or modified files. List any manual steps needed (Supabase setup, Vercel env vars).

✅ CHECKPOINT:
`pnpm build` succeeds. Deploy to Vercel preview. Full flow works on the deployed URL. Team can log in, upload, view dashboards, export PDFs.

---

## Post-Launch Enhancements (v2 Backlog)

These are NOT part of the initial build chain. Implement after v1 is stable.

1. **Side-by-side comparison** — compare two uploads on the same screen
2. **Chart images in PDF** — convert Recharts to PNG for PDF inclusion
3. **Multi-sheet support** — parse all sheets in a workbook, let user pick
4. **Scheduled uploads** — API endpoint for automated file ingestion
5. **Supabase Auth migration** — if team grows beyond 10, swap to email/password auth
6. **Column aliasing** — let users rename columns for cleaner dashboards
7. **Saved chart configs** — persist user's custom chart selections per upload
8. **Dark mode toggle** — explicit toggle in the UI (currently follows system preference)
