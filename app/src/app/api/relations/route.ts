import { NextRequest, NextResponse } from 'next/server'
import { getRelations } from '@/lib/wordService'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get('word')?.trim().toLowerCase()
  const type = req.nextUrl.searchParams.get('type')

  if (!word || !type) {
    return NextResponse.json({ error: 'Missing word or type param' }, { status: 400 })
  }

  try {
    const words = await getRelations(word, type)
    return NextResponse.json(words)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('GET /api/relations failed', { word, type, error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
