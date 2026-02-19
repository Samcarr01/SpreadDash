/**
 * AI response parsing and validation
 */

import { AIAnalysisResult, AIAnalysisResultSchema } from '@/types'

/**
 * Parses and validates Claude Haiku's response
 *
 * Tries:
 * 1. Direct JSON parse
 * 2. Extract JSON from markdown code fences
 * 3. Validate with Zod schema
 *
 * Never throws - always returns null on failure.
 *
 * @param rawText - Raw response from Claude API
 * @returns Validated AIAnalysisResult or null on failure
 */
export function parseAIResponse(rawText: string): AIAnalysisResult | null {
  try {
    // Try direct JSON parse first
    let parsed: unknown

    try {
      parsed = JSON.parse(rawText)
    } catch {
      // Not direct JSON - try extracting from markdown code fences
      parsed = extractJSONFromMarkdown(rawText)
      if (!parsed) {
        console.error('[AI Analysis] Failed to extract JSON from response')
        console.error('[AI Analysis] Raw response:', rawText.substring(0, 500))
        return null
      }
    }

    // Validate with Zod schema
    const result = AIAnalysisResultSchema.safeParse(parsed)

    if (!result.success) {
      console.error('[AI Analysis] Schema validation failed')
      console.error('[AI Analysis] Validation errors:', JSON.stringify(result.error.issues, null, 2))
      console.error('[AI Analysis] Parsed object:', JSON.stringify(parsed, null, 2))
      return null
    }

    return result.data
  } catch (error) {
    console.error('[AI Analysis] Unexpected error during parsing:', error)
    return null
  }
}

/**
 * Extracts JSON from markdown code fences
 *
 * Handles formats like:
 * ```json
 * { ... }
 * ```
 *
 * or just:
 * ```
 * { ... }
 * ```
 *
 * @param text - Text potentially containing markdown-wrapped JSON
 * @returns Parsed JSON or null
 */
function extractJSONFromMarkdown(text: string): unknown | null {
  // Try to find JSON within code fences
  const patterns = [
    /```json\s*\n([\s\S]*?)\n```/,  // ```json ... ```
    /```\s*\n([\s\S]*?)\n```/,      // ``` ... ```
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      try {
        return JSON.parse(match[1])
      } catch {
        // Continue to next pattern
      }
    }
  }

  // Try to find JSON object directly (look for { ... })
  const jsonObjectMatch = text.match(/\{[\s\S]*\}/)
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0])
    } catch {
      // Failed to parse
    }
  }

  return null
}
