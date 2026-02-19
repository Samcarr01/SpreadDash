# Database — Supabase Schema and Storage

All persistent data lives in Supabase PostgreSQL. File originals are stored in Supabase Storage. The schema is designed for fast reads (dashboard rendering) and efficient historical comparison.

## Features

### Uploads Table

#### Constraints
- **`id` must be UUID v4, auto-generated**
- **`raw_data` JSONB must store the fully parsed sheet as an array of row objects**
- **`sheet_meta` JSONB must store detected column metadata (types, headers, date columns)**
- **`file_url` must point to the original file in Supabase Storage**
- *`label` defaults to filename if user doesn't provide one*
- *`uploaded_by` is a free-text name field — no foreign key, no accounts*

#### Schema
```sql
CREATE TABLE uploads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename        TEXT NOT NULL,
  label           TEXT,
  uploaded_by     TEXT DEFAULT 'Team',
  uploaded_at     TIMESTAMPTZ DEFAULT now(),
  file_url        TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  row_count       INTEGER NOT NULL,
  column_count    INTEGER NOT NULL,
  raw_data        JSONB NOT NULL,
  sheet_meta      JSONB NOT NULL,
  insights_data   JSONB,
  ai_analysis     JSONB,
  ai_status       TEXT DEFAULT 'pending' CHECK (ai_status IN ('pending', 'completed', 'failed', 'skipped')),
  status          TEXT DEFAULT 'processed' CHECK (status IN ('processing', 'processed', 'failed'))
);

CREATE INDEX idx_uploads_uploaded_at ON uploads (uploaded_at DESC);
CREATE INDEX idx_uploads_status ON uploads (status);
```

### Sheet Meta Structure

#### Constraints
- **Must store enough metadata that the dashboard can render without re-parsing the file**
- **Column types must be one of: `date`, `number`, `text`, `category`**

#### JSONB Shape
```typescript
interface SheetMeta {
  headers: string[];                    // Original column headers
  columns: ColumnMeta[];                // Detected metadata per column
  dateColumnIndex: number | null;       // Primary date column for X axis
  numericColumnIndices: number[];       // Columns usable as metrics
  categoryColumnIndices: number[];      // Columns usable as filters/group-by
  totalRows: number;
  totalColumns: number;
}

interface ColumnMeta {
  index: number;
  header: string;
  detectedType: 'date' | 'number' | 'text' | 'category';
  sampleValues: string[];              // First 5 non-empty values
  nullCount: number;
  uniqueCount: number;
}
```

### Saved Reports Table

#### Constraints
- **Each report must link to an upload via `upload_id`**
- **`pdf_url` must point to a file in Supabase Storage**
- *Reports are append-only — no updates, only new exports*

#### Schema
```sql
CREATE TABLE saved_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id   UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  pdf_url     TEXT NOT NULL,
  label       TEXT,
  file_size   INTEGER
);

CREATE INDEX idx_reports_upload_id ON saved_reports (upload_id);
CREATE INDEX idx_reports_created_at ON saved_reports (created_at DESC);
```

### Supabase Storage

#### Constraints
- **Bucket name: `spreadsheet-uploads`**
- **Max file size: 25 MB**
- **Allowed MIME types: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`, `text/csv`**
- **Folder structure: `originals/{upload-id}/{filename}` for spreadsheets, `reports/{upload-id}/{timestamp}.pdf` for PDFs**
- *Enable Supabase Storage policies to restrict access to authenticated service role only*

#### Setup
```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('spreadsheet-uploads', 'spreadsheet-uploads', false);

-- Storage policy: only service role can read/write
CREATE POLICY "Service role access only"
ON storage.objects FOR ALL
USING (bucket_id = 'spreadsheet-uploads')
WITH CHECK (bucket_id = 'spreadsheet-uploads');
```

### Row Level Security

#### Constraints
- **RLS must be enabled on all tables**
- **All access goes through the service role key (server-side API routes)**
- **No direct client-side access to tables — all reads/writes via Next.js API routes**

#### Setup
```sql
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on uploads"
ON uploads FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access on saved_reports"
ON saved_reports FOR ALL
USING (true)
WITH CHECK (true);
```

## Migration Notes

- Run all migrations via Supabase Dashboard or `supabase db push`
- Keep migration files in `supabase/migrations/` if using the Supabase CLI
- The `insights_data` column on `uploads` stores pre-computed insights so they don't need to be recalculated on every dashboard view
