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
