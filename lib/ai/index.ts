/**
 * Claude Haiku AI analysis integration
 *
 * Optional narrative layer on top of rule-based insights.
 * All failures are non-fatal - the app works perfectly without AI.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AIAnalysisResult, SheetMeta, InsightsResult } from '@/types'
import { buildSystemPrompt, buildUserPrompt } from './promptBuilder'
import { parseAIResponse } from './responseParser'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const AI_TIMEOUT_MS = 15000 // 15 seconds
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// Warn once at module load if API key is missing
if (!ANTHROPIC_API_KEY) {
  console.warn('[AI Analysis] ANTHROPIC_API_KEY not set - AI analysis will be skipped')
}

/**
 * Analyzes spreadsheet data using Claude Haiku
 *
 * Generates:
 * - Executive summary (3-5 sentences)
 * - Cross-column patterns
 * - Action items
 * - Data quality concerns
 *
 * Never throws - always resolves with result or null.
 * All failures are non-fatal.
 *
 * @param sheetMeta - Sheet metadata
 * @param insightsResult - Pre-computed insights
 * @param rawData - Full dataset (will be sampled)
 * @returns AIAnalysisResult or null on any failure
 */
export async function analyseWithAI(
  sheetMeta: SheetMeta,
  insightsResult: InsightsResult,
  rawData: Record<string, unknown>[]
): Promise<AIAnalysisResult | null> {
  // Check if API key is configured
  if (!ANTHROPIC_API_KEY) {
    console.warn('[AI Analysis] Skipping - ANTHROPIC_API_KEY not configured')
    return null
  }

  try {
    // Build prompts
    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(sheetMeta, insightsResult, rawData)

    // Initialize Anthropic client
    const client = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    })

    // Create abort controller for timeout
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, AI_TIMEOUT_MS)

    // Call Claude Haiku API
    const response = await client.messages.create(
      {
        model: HAIKU_MODEL,
        max_tokens: 1024,
        temperature: 0,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      },
      {
        signal: abortController.signal,
      }
    )

    clearTimeout(timeoutId)

    // Extract text from response
    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      console.error('[AI Analysis] No text content in response')
      return null
    }

    // Parse and validate response
    const result = parseAIResponse(textContent.text)

    if (!result) {
      console.error('[AI Analysis] Failed to parse AI response')
      return null
    }

    console.log('[AI Analysis] Successfully generated analysis')
    return result
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[AI Analysis] Request timeout after 15 seconds')
      } else if (error.message.includes('rate_limit')) {
        console.error('[AI Analysis] Rate limit exceeded')
      } else if (error.message.includes('api_key')) {
        console.error('[AI Analysis] Invalid API key')
      } else {
        console.error('[AI Analysis] Unexpected error:', error.message)
      }
    } else {
      console.error('[AI Analysis] Unknown error:', error)
    }

    return null
  }
}
