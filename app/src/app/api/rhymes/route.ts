import { NextRequest, NextResponse } from 'next/server'
import { getRhymes } from '@/lib/wordService'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get('word')?.trim().toLowerCase()

  if (!word) {
    return NextResponse.json({ error: 'Missing word param' }, { status: 400 })
  }

  try {
    const groups = await getRhymes(word)
    return NextResponse.json(groups)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('GET /api/rhymes failed', { word, error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
