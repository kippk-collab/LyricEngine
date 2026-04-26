import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLlmGroupedRelations } from '@/lib/llmService';
import { UsageLimitError } from '@/lib/wordService';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const word = req.nextUrl.searchParams.get('word')?.trim().toLowerCase();
  const type = req.nextUrl.searchParams.get('type');

  if (!word || !type) {
    return NextResponse.json({ error: 'Missing word or type param' }, { status: 400 });
  }

  try {
    const result = await getLlmGroupedRelations(supabase, word, type, user.id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UsageLimitError) {
      return NextResponse.json(
        { error: 'usage_limit', message: err.message, tier: err.tier, used: err.used, limit: err.limit },
        { status: 429 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('GET /api/llm-relations failed', { word, type, error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
