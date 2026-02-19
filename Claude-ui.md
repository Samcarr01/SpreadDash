# UI — Pages, Components and Design System

All user-facing interface built with Next.js 14 App Router, Tailwind CSS and shadcn/ui. Server components by default. Client components only where interactivity is needed (charts, forms, file upload).

## Design Principles

- **Internal tool aesthetic** — clean, dense, functional. Not a marketing site.
- **Data-first** — maximise screen real estate for charts and data. Minimal chrome.
- **Responsive** — works on desktop (primary) and tablet. Mobile is secondary but functional.
- **Loading states everywhere** — skeleton loaders for data fetches, progress bars for uploads.
- **Dark mode support** — use Tailwind `dark:` classes and shadcn/ui theming.

## Features

### Login Page (`/page.tsx`)

#### Constraints
- **Server component with a client form child**
- **Single centered card with:** SpreadDash logo/name, access code input (password type), submit button, error message display
- **On submit:** call `/api/auth/login`, redirect to `/dashboard` on success
- **Show loading spinner on button while request is in flight**
- *Keyboard: Enter key submits the form*
- *Auto-focus the code input on page load*

#### Layout
```
┌─────────────────────────────┐
│                             │
│       ┌───────────┐        │
│       │ SpreadDash│        │
│       │           │        │
│       │ [code   ] │        │
│       │ [Enter ▶] │        │
│       │ error msg │        │
│       └───────────┘        │
│                             │
└─────────────────────────────┘
```

### Dashboard Shell (`/dashboard/layout.tsx`)

#### Constraints
- **Server component layout wrapping all dashboard routes**
- **Left sidebar (280px):** upload list, new upload button, logout button
- **Top bar:** current view title, breadcrumb, export PDF button
- **Main area:** rendered child route
- **Sidebar is collapsible on tablet/mobile → hamburger menu**

#### Sidebar Content
- "New Upload" button (always visible, top of sidebar)
- Search/filter input for uploads
- Upload list: each item shows label (or filename), date, row count badge
- Active upload highlighted
- Logout button at bottom

### Upload List Page (`/dashboard/page.tsx`)

#### Constraints
- **Default view when no upload is selected**
- **Show a grid of recent uploads as cards (last 12)**
- **Each card shows:** label, filename, date, row count, column count, status badge
- **Click card → navigate to `/dashboard/[id]`**
- **Prominent upload zone at top:** drag-and-drop area + click to browse
- **Upload progress:** show filename, progress bar, status messages during processing

### DropZone Component

#### Constraints
- **Client component**
- **Accept `.xlsx`, `.xls`, `.csv` files only**
- **Max 25 MB — validate client-side before upload**
- **Drag-and-drop with visual feedback (border highlight, icon change)**
- **Also supports click-to-browse via hidden file input**
- **Optional fields before upload:** label (text input), uploaded by (text input with default "Team")
- **On submit:** POST to `/api/upload` as multipart/form-data
- **Show upload progress states:** uploading → parsing → analysing → complete
- **On success:** redirect to `/dashboard/[new-id]`
- **On error:** show error message with retry button

### Sheet Dashboard (`/dashboard/[id]/page.tsx`)

#### Constraints
- **Fetch upload data from `/api/uploads/[id]`**
- **Four tabs using shadcn Tabs component:** Overview, Charts, Data, Insights
- **Default to Overview tab**
- **Export PDF button in top bar is active when viewing a dashboard**

#### Overview Tab
- KPI card grid (2–4 columns responsive) showing all numeric metrics
- Each card: metric name, current value, change %, sparkline, trend arrow (green up / red down / grey flat)
- Headline chart below KPI cards (auto-selected by insights engine)
- AI Executive Summary card (if available) — bordered card with Haiku's narrative summary, subtle "AI-generated" badge
- Top 3 insights as highlight cards below the chart

#### Charts Tab
- Column picker: dropdowns to select X axis and Y axis columns
- Chart type switcher: line, bar, area (toggle buttons)
- Interactive Recharts chart with tooltip, legend, responsive container
- "Add series" button to overlay multiple Y columns
- Reset button to return to auto-selected config

#### Data Tab
- Full data table using a client component
- Sortable columns (click header to sort)
- Filterable: text search across all columns
- Paginated: 50 rows per page
- Column visibility toggle
- Cell formatting: dates formatted nicely, numbers with commas, percentages with %

#### Insights Tab
- **AI Analysis section (top of tab):**
  - If `ai_status === 'completed'`: Show executive summary, cross-column patterns as cards, action items as a checklist, data quality concerns as warning badges
  - If `ai_status === 'pending'`: Show skeleton loader with "AI analysis in progress..." text
  - If `ai_status === 'failed'` or `'skipped'`: Show subtle banner "AI analysis unavailable" with "Retry" button
  - "Regenerate AI Analysis" button (triggers `POST /api/uploads/[id]/analyse`)
  - Subtle "AI-generated" badge on all AI content
- Full list of rule-based auto-generated insights (always shown regardless of AI status)
- Each insight as a card with: icon (based on severity), title, description, related column badges
- Trend summary section: table showing each numeric column with trend direction, change %, stats
- "No numeric data" empty state if applicable

### History Page (`/history/page.tsx`)

#### Constraints
- **Table view of all uploads**
- **Columns:** label, filename, uploaded by, date, rows, columns, reports count, actions
- **Actions per row:** view dashboard (link), download original file, view reports
- **Sort by any column (default: date descending)**
- **Future: side-by-side comparison view (v2)**

### KPICardGrid Component

#### Constraints
- **Accepts `KPICard[]` from insights data**
- **Responsive grid: 4 columns on desktop, 2 on tablet, 1 on mobile**
- **Each card uses shadcn Card component**
- **Colour coding:** green text/icon for positive change, red for negative, grey for flat
- **Sparkline rendered with a tiny Recharts LineChart (no axes, no labels, just the line)**

### Chart Components

#### Constraints
- **All charts must be wrapped in `ResponsiveContainer` from Recharts**
- **Consistent colour palette across all charts** (define 6 brand colours)
- **All charts include:** tooltip on hover, legend if >1 series, grid lines
- **ChartSwitcher component:** receives data + config, renders the correct chart type
- **No chart component should fetch data — receive via props only**

### PDFReport Component

#### Constraints
- **Uses @react-pdf/renderer**
- **A4 portrait layout**
- **Contents:** branded header (SpreadDash + label + date), KPI summary table, insights list, data preview (first 20 rows), footer with generation timestamp
- **Charts are NOT included in PDF (v1)** — only tabular KPI data and text insights
- *Future: use chart-to-image conversion for PDF charts (v2)*

### AuthGuard Component

#### Constraints
- **Client component that wraps protected content**
- **On mount: check if session cookie exists (client-side check for UX only — real auth is server-side)**
- **If no cookie: redirect to `/`**
- **Show loading skeleton while checking**
- *This is a UX enhancement only — actual security is enforced by middleware and API route checks*

## Component Library (shadcn/ui)

Required components to install:
`button`, `card`, `input`, `label`, `tabs`, `table`, `badge`, `dropdown-menu`, `dialog`, `skeleton`, `toast`, `progress`, `separator`, `select`, `tooltip`

## Colour Palette

```typescript
const chartColours = [
  '#2563eb', // blue-600
  '#16a34a', // green-600
  '#ea580c', // orange-600
  '#9333ea', // purple-600
  '#e11d48', // rose-600
  '#0891b2', // cyan-600
];

const trendColours = {
  up: '#16a34a',     // green
  down: '#dc2626',   // red
  flat: '#6b7280',   // grey
};
```
