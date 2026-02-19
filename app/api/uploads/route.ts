import { NextRequest, NextResponse } from 'next/server'
import { handleApiRoute, validateSession } from '@/lib/api-helpers'
import { supabaseServer } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    // Validate session
    const sessionOrResponse = await validateSession(request)
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse
    }

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const orderBy = searchParams.get('orderBy') || 'uploaded_at'
    const order = searchParams.get('order') || 'desc'

    // Validate pagination limits
    const safeLimit = Math.min(Math.max(1, limit), 100)
    const safeOffset = Math.max(0, offset)

    // Query uploads without raw_data (too large for list view)
    const { data: uploads, error, count } = await supabaseServer
      .from('uploads')
      .select(
        `
        id,
        filename,
        label,
        uploaded_by,
        file_url,
        file_size_bytes,
        row_count,
        column_count,
        sheet_meta,
        insights_data,
        ai_analysis,
        ai_status,
        status,
        uploaded_at
      `,
        { count: 'exact' }
      )
      .order(orderBy as any, { ascending: order === 'asc' })
      .range(safeOffset, safeOffset + safeLimit - 1)

    if (error) {
      console.error('[Uploads List] Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch uploads' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        uploads: uploads || [],
        pagination: {
          total: count || 0,
          limit: safeLimit,
          offset: safeOffset,
          hasMore: (count || 0) > safeOffset + safeLimit,
        },
      },
    })
  })
}
