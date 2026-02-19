import { NextRequest, NextResponse } from 'next/server'
import { handleApiRoute, validateSession } from '@/lib/api-helpers'
import { supabaseServer } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  return handleApiRoute(async () => {
    // Validate session
    const sessionOrResponse = await validateSession(request)
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse
    }

    // Get upload ID from params
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Upload ID required' },
        { status: 400 }
      )
    }

    // Fetch upload by ID (including raw_data for detail view)
    const { data: upload, error } = await supabaseServer
      .from('uploads')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return NextResponse.json(
          { success: false, error: 'Upload not found' },
          { status: 404 }
        )
      }

      console.error('[Upload Detail] Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch upload' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: upload,
    })
  })
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  return handleApiRoute(async () => {
    // Validate session
    const sessionOrResponse = await validateSession(request)
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse
    }

    // Get upload ID from params
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Upload ID required' },
        { status: 400 }
      )
    }

    // First, get the upload to find associated files
    const { data: upload, error: fetchError } = await supabaseServer
      .from('uploads')
      .select('id, filename, file_url')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Upload not found' },
          { status: 404 }
        )
      }
      console.error('[Delete Upload] Fetch error:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to find upload' },
        { status: 500 }
      )
    }

    // Delete associated saved_reports
    const { error: reportsError } = await supabaseServer
      .from('saved_reports')
      .delete()
      .eq('upload_id', id)

    if (reportsError) {
      console.error('[Delete Upload] Reports delete error:', reportsError)
      // Continue anyway - not critical
    }

    // Delete files from storage
    // Delete original file
    const originalPath = `originals/${id}/${upload.filename}`
    await supabaseServer.storage
      .from('spreadsheet-uploads')
      .remove([originalPath])

    // Delete any PDF reports
    const { data: reportFiles } = await supabaseServer.storage
      .from('spreadsheet-uploads')
      .list(`reports/${id}`)

    if (reportFiles && reportFiles.length > 0) {
      const reportPaths = reportFiles.map(f => `reports/${id}/${f.name}`)
      await supabaseServer.storage
        .from('spreadsheet-uploads')
        .remove(reportPaths)
    }

    // Delete the upload record
    const { error: deleteError } = await supabaseServer
      .from('uploads')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[Delete Upload] Database error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete upload' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Upload deleted successfully',
    })
  })
}
