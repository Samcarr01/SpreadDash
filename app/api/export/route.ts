import { NextRequest, NextResponse } from 'next/server'
import { handleApiRoute, validateSession } from '@/lib/api-helpers'
import { supabaseServer } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { z } from 'zod'
import PDFReport from '@/components/export/PDFReport'
import { randomUUID } from 'crypto'

const ExportRequestSchema = z.object({
  uploadId: z.string().uuid(),
  label: z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    // Validate session
    const sessionOrResponse = await validateSession(request)
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = ExportRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          issues: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const { uploadId, label } = validationResult.data

    // Fetch upload data
    const { data: upload, error: fetchError } = await supabaseServer
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Upload not found' },
          { status: 404 }
        )
      }

      console.error('[Export] Fetch error:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch upload' },
        { status: 500 }
      )
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      PDFReport({ upload, reportLabel: label })
    )

    // Upload PDF to Supabase Storage
    const timestamp = Date.now()
    const storagePath = `reports/${uploadId}/${timestamp}.pdf`
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from('spreadsheet-uploads')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Export] Storage error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to store PDF' },
        { status: 500 }
      )
    }

    // Get public URL for the stored PDF
    const { data: urlData } = supabaseServer.storage
      .from('spreadsheet-uploads')
      .getPublicUrl(storagePath)

    const pdfUrl = urlData.publicUrl

    // Insert report record
    const reportId = randomUUID()
    const { data: reportRecord, error: dbError } = await supabaseServer
      .from('saved_reports')
      .insert({
        id: reportId,
        upload_id: uploadId,
        label,
        pdf_url: pdfUrl,
        file_size: pdfBuffer.byteLength,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Export] Database error:', dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to save report' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: reportRecord },
      { status: 201 }
    )
  })
}
