import { NextRequest, NextResponse } from 'next/server'
import { handleApiRoute, validateSession } from '@/lib/api-helpers'
import { analyseWithAI } from '@/lib/ai'
import { supabaseServer } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(
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

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI analysis not configured' },
        { status: 503 }
      )
    }

    // Fetch upload record to get data for analysis
    const { data: upload, error: fetchError } = await supabaseServer
      .from('uploads')
      .select('sheet_meta, insights_data, raw_data, filename')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Upload not found' },
          { status: 404 }
        )
      }

      console.error('[AI Analyse] Fetch error:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch upload' },
        { status: 500 }
      )
    }

    // Call AI analysis
    const aiAnalysis = await analyseWithAI(
      upload.sheet_meta,
      upload.insights_data,
      upload.raw_data,
      upload.filename
    )

    const aiStatus = aiAnalysis ? 'completed' : 'failed'

    // Update the record
    const { data: updatedUpload, error: updateError } = await supabaseServer
      .from('uploads')
      .update({
        ai_analysis: aiAnalysis,
        ai_status: aiStatus,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[AI Analyse] Update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update analysis' },
        { status: 500 }
      )
    }

    // Return updated record without raw_data
    const { raw_data: _, ...responseData } = updatedUpload

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  })
}
