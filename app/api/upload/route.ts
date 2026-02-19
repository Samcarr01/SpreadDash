import { NextRequest, NextResponse } from 'next/server'
import { handleApiRoute, validateSession } from '@/lib/api-helpers'
import { parseSpreadsheet } from '@/lib/parser'
import { generateInsights } from '@/lib/insights'
import { analyseWithAI } from '@/lib/ai'
import { supabaseServer } from '@/lib/supabase/server'
import { LIMITS } from '@/types'
import { randomUUID } from 'crypto'

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'text/plain', // Some systems send CSV as plain text
  'application/octet-stream', // Generic binary, check extension instead
]

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    // Validate session
    const sessionOrResponse = await validateSession(request)
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const label = (formData.get('label') as string) || null
    const uploadedBy = (formData.get('uploadedBy') as string) || 'Team'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file extension
    const filename = file.name
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid MIME type',
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > LIMITS.MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Max size: ${LIMITS.MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB`,
        },
        { status: 413 }
      )
    }

    // Generate UUID for this upload
    const uploadId = randomUUID()

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload original file to Supabase Storage
    const storagePath = `originals/${uploadId}/${filename}`
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from('spreadsheet-uploads')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Upload] Storage error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to store file' },
        { status: 500 }
      )
    }

    // Get public URL for the stored file
    const { data: urlData } = supabaseServer.storage
      .from('spreadsheet-uploads')
      .getPublicUrl(storagePath)

    const fileUrl = urlData.publicUrl

    // Parse the file
    const parseResult = await parseSpreadsheet(buffer, filename)

    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error || 'Failed to parse file',
        },
        { status: 400 }
      )
    }

    const { raw_data, sheet_meta } = parseResult.data

    // Generate rule-based insights
    const insightsResult = generateInsights(raw_data, sheet_meta)

    // Call AI analysis (optional, non-blocking)
    let aiAnalysis = null
    let aiStatus: 'pending' | 'completed' | 'failed' | 'skipped' = 'pending'

    if (process.env.ANTHROPIC_API_KEY) {
      aiAnalysis = await analyseWithAI(sheet_meta, insightsResult, raw_data, filename)
      aiStatus = aiAnalysis ? 'completed' : 'failed'
    } else {
      aiStatus = 'skipped'
    }

    // Insert record into uploads table
    const { data: uploadRecord, error: dbError } = await supabaseServer
      .from('uploads')
      .insert({
        id: uploadId,
        filename,
        label,
        uploaded_by: uploadedBy,
        file_url: fileUrl,
        file_size_bytes: file.size,
        row_count: sheet_meta.totalRows,
        column_count: sheet_meta.totalColumns,
        raw_data,
        sheet_meta,
        insights_data: insightsResult,
        ai_analysis: aiAnalysis,
        ai_status: aiStatus,
        status: 'processed',
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Upload] Database error:', dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to save upload' },
        { status: 500 }
      )
    }

    // Return the record without raw_data (too large for response)
    const { raw_data: _, ...responseData } = uploadRecord

    return NextResponse.json(
      { success: true, data: responseData },
      { status: 201 }
    )
  })
}
