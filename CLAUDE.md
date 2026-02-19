# SpreadDash — Objective

Turn any Excel or CSV file into a live interactive dashboard with auto-detected KPIs, trend analysis and AI-generated insights. Internal tool for a small team (2–10 people) with shared access code authentication. Every upload is saved to Supabase so the team can view, compare and export historical dashboards at any time.

## Modules

- **Auth** — [Claude-auth.md](Claude-auth.md) — Shared access code, session cookie, server-side validation
- **API** — [Claude-api.md](Claude-api.md) — All Next.js API routes: auth, upload, export, data retrieval
- **UI** — [Claude-ui.md](Claude-ui.md) — Pages, layouts, components, responsive design system
- **Parser** — [Claude-parser.md](Claude-parser.md) — SheetJS file parsing, column detection, type classification
- **Database** — [Claude-db.md](Claude-db.md) — Supabase schema, storage buckets, RLS policies, migrations
- **Insights** — [Claude-insights.md](Claude-insights.md) — Trend detection, auto-recommendations, KPI extraction
- **AI Analysis** — [Claude-ai.md](Claude-ai.md) — Claude Haiku narrative layer on top of rule-based insights

## Global Constraints

1. **All API routes must validate the session cookie before processing requests**
2. **No hardcoded secrets — all sensitive values via environment variables**
3. **Every file upload must be size-limited (25 MB max) and type-validated (.xlsx, .xls, .csv only)**
4. **All Supabase queries must use the service role key server-side only — never expose to client**
5. *Keep each .md module under 50 KB for optimal Claude parsing*
6. *Prefer server components by default; use client components only when interactivity is required*
7. *All error states must show user-friendly messages with retry options*
8. **Rate limit upload endpoint to 10 uploads per minute per session**

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Server components default |
| Hosting | Vercel | Edge functions where beneficial |
| Database | Supabase (PostgreSQL) | Row Level Security enabled |
| File Storage | Supabase Storage | Bucket: `spreadsheet-uploads` |
| File Parsing | SheetJS (xlsx) | Server-side only |
| Charts | Recharts | Responsive, accessible |
| PDF Export | @react-pdf/renderer | Client-side generation |
| AI Analysis | @anthropic-ai/sdk (Haiku) | Server-side, optional |
| Styling | Tailwind CSS + shadcn/ui | Consistent design system |
| Validation | Zod | All inputs validated |

## Environment Variables

```yaml
NEXT_PUBLIC_SUPABASE_URL: "Supabase project URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY: "Supabase anonymous key (public)"
SUPABASE_SERVICE_ROLE_KEY: "Supabase service role key (server only)"
ACCESS_CODE: "Shared team access code (server only)"
SESSION_SECRET: "Secret for signing session cookies (server only)"
ANTHROPIC_API_KEY: "Anthropic API key for Claude Haiku analysis (server only, optional)"
```

## Folder Structure

```
spreaddash/
├── CLAUDE.md
├── ClaudeOps.json
├── app/
│   ├── layout.tsx                  ← Root layout with font + metadata
│   ├── page.tsx                    ← Login page
│   ├── dashboard/
│   │   ├── layout.tsx              ← Dashboard shell with sidebar
│   │   ├── page.tsx                ← Upload list + new upload
│   │   └── [id]/
│   │       └── page.tsx            ← Individual sheet dashboard
│   ├── history/
│   │   └── page.tsx                ← Upload history + comparison
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts      ← POST access code check
│       │   └── logout/route.ts     ← POST clear session
│       ├── upload/route.ts         ← POST parse + save spreadsheet
│       ├── uploads/
│       │   ├── route.ts            ← GET list all uploads
│       │   └── [id]/
│       │       ├── route.ts        ← GET single upload data
│       │       └── analyse/route.ts ← POST retrigger AI analysis
│       └── export/route.ts         ← POST generate PDF report
├── components/
│   ├── ui/                         ← shadcn/ui components
│   ├── charts/                     ← Recharts wrappers
│   │   ├── LineChartCard.tsx
│   │   ├── BarChartCard.tsx
│   │   ├── AreaChartCard.tsx
│   │   └── ChartSwitcher.tsx
│   ├── dashboard/
│   │   ├── KPICardGrid.tsx
│   │   ├── InsightPanel.tsx
│   │   ├── DashboardTabs.tsx
│   │   ├── DataTable.tsx
│   │   ├── ColumnPicker.tsx
│   │   ├── AISummaryCard.tsx
│   │   └── AIInsightsPanel.tsx
│   ├── upload/
│   │   ├── DropZone.tsx
│   │   └── UploadProgress.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── AuthGuard.tsx
│   └── export/
│       └── PDFReport.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← Browser Supabase client
│   │   └── server.ts               ← Server Supabase client (service role)
│   ├── parser/
│   │   ├── index.ts                ← Main parse orchestrator
│   │   ├── columnDetector.ts       ← Type classification logic
│   │   └── sheetNormaliser.ts      ← Header detection, cleanup
│   ├── insights/
│   │   ├── index.ts                ← Main insights orchestrator
│   │   ├── trendDetector.ts        ← Rising/falling/flat detection
│   │   └── recommendations.ts      ← Rule-based insight generation
│   ├── ai/
│   │   ├── index.ts                ← Main analyseWithAI() function
│   │   ├── promptBuilder.ts        ← System + user prompt construction
│   │   └── responseParser.ts       ← JSON extraction + Zod validation
│   ├── auth.ts                     ← Cookie helpers, session validation
│   └── utils.ts                    ← Shared formatters, helpers
├── types/
│   └── index.ts                    ← All TypeScript types + Zod schemas
├── middleware.ts                   ← Route protection via session check
└── .env.local                      ← Environment variables (git-ignored)
```

## Memory Loading Order

1. Claude reads `CLAUDE.md` (this file) for project context
2. Claude loads the relevant module file for the current task
3. Claude references `ClaudeOps.json` for stack and prompt pack config
4. Claude executes build prompts sequentially from `Claude-build-chain.md`

## Improvements Over Original Spec

1. **Replaced Puppeteer with @react-pdf/renderer** — no headless browser needed on Vercel, lighter bundle, faster exports
2. **Added middleware.ts** — centralised route protection instead of checking auth in every API route
3. **Added Zod validation** — typed runtime validation for all inputs
4. **Added rate limiting** — prevents abuse of upload endpoint
5. **Added session secret** — signed cookies instead of plain text
6. **Added column picker** — users can customise which columns appear on charts
7. **Separated parser into sub-modules** — column detection and normalisation are distinct concerns
8. **Added upload progress component** — better UX for large files
9. **Added Claude Haiku AI narrative layer** — generates executive summaries, cross-column patterns and action items on top of the rule-based engine. Costs ~$0.004 per upload. Fully optional — remove the API key and the app works without it.
