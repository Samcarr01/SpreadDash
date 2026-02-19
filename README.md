# SpreadDash

Turn any Excel or CSV file into a live interactive dashboard with auto-detected KPIs, trend analysis, and AI-generated insights.

## Overview

SpreadDash is an internal tool for small teams (2-10 people) that transforms spreadsheets into interactive dashboards. Every upload is saved to Supabase, allowing the team to view, compare, and export historical dashboards at any time.

## Features

- **File Upload**: Drag-and-drop support for .xlsx, .xls, and .csv files (up to 25 MB)
- **Auto-Detection**: Automatically identifies date columns, numeric columns, and key metrics
- **KPI Tracking**: Detects trends (rising/falling/stable) across time-series data
- **AI Analysis**: Optional Claude Haiku integration for executive summaries and insights
- **Interactive Charts**: Line, bar, and area charts with customizable axes
- **Data Explorer**: Sortable, searchable table with column visibility controls
- **PDF Export**: Generate professional PDF reports with KPIs, insights, and data preview
- **Shared Access**: Team authentication via shared access code
- **Upload History**: Browse and compare all historical uploads

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Server components by default |
| Hosting | Vercel | Edge functions where beneficial |
| Database | Supabase (PostgreSQL) | Row Level Security enabled |
| File Storage | Supabase Storage | Bucket: `spreadsheet-uploads` |
| File Parsing | SheetJS (xlsx) | Server-side only |
| Charts | Recharts | Responsive, accessible |
| PDF Export | @react-pdf/renderer | Server-side generation |
| AI Analysis | @anthropic-ai/sdk (Haiku) | Server-side, optional |
| Styling | Tailwind CSS + shadcn/ui | Consistent design system |
| Validation | Zod | All inputs validated |

## Prerequisites

- Node.js 18+ (or compatible)
- pnpm (recommended) or npm
- Supabase account
- Anthropic API key (optional, for AI analysis)

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd SpreadDash
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the database migrations from `/supabase/migrations/` (see CLAUDE.md for schema)
3. Create a storage bucket named `spreadsheet-uploads` with public read access
4. Copy your project URL and keys

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Authentication
ACCESS_CODE="your-shared-team-access-code"
SESSION_SECRET="your-session-secret-min-32-chars"

# AI Analysis (Optional)
ANTHROPIC_API_KEY="sk-ant-..."
```

**Important**:
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `ACCESS_CODE`, `SESSION_SECRET`, and `ANTHROPIC_API_KEY` secret
- Generate `SESSION_SECRET` with at least 32 random characters
- If `ANTHROPIC_API_KEY` is not set, AI analysis will be skipped

### 5. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your `ACCESS_CODE`.

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and import your repository
2. Add all environment variables from `.env.local` in the Vercel project settings
3. Deploy!

### 3. Post-deployment

- Verify the app works by uploading a test spreadsheet
- Check that PDF export generates successfully
- Test AI analysis if you configured `ANTHROPIC_API_KEY`

## Project Structure

```
spreaddash/
├── app/                    # Next.js App Router pages and API routes
│   ├── dashboard/         # Dashboard pages
│   ├── history/           # Upload history
│   └── api/               # API routes (auth, upload, export)
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── charts/           # Chart components (Recharts)
│   ├── dashboard/        # Dashboard-specific components
│   ├── upload/           # Upload flow components
│   ├── layout/           # Layout components (TopBar, Sidebar)
│   └── export/           # PDF export components
├── lib/                   # Utilities and business logic
│   ├── supabase/         # Supabase clients
│   ├── parser/           # Spreadsheet parsing logic
│   ├── insights/         # Trend detection and insights
│   └── ai/               # AI analysis integration
├── types/                 # TypeScript types and Zod schemas
└── middleware.ts          # Route protection
```

## Security

- **Session cookies** are signed with `SESSION_SECRET` and use `httpOnly`, `secure`, `sameSite: strict`
- **Middleware** validates JWT tokens on all protected routes
- **API routes** re-validate sessions server-side
- **Row Level Security** is enabled on Supabase tables
- **Service role key** is never exposed to the client
- **Access code** comparison uses timing-safe equality to prevent timing attacks

## Costs

- **Supabase**: Free tier supports small teams. Upgrade if you exceed storage/bandwidth limits.
- **Vercel**: Free tier is sufficient for internal tools. Hobby plan recommended for production.
- **Anthropic API**: Claude Haiku costs ~$0.004 per upload (optional). Disable by removing `ANTHROPIC_API_KEY`.

## Support

For issues or feature requests, see the project documentation in `CLAUDE.md` or contact the maintainer.

## License

Internal use only. Not licensed for public distribution.
