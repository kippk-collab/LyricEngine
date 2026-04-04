import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Types ────────────────────────────────────────────────────────────────────

export type RelationType =
  | 'rhy' | 'nry' | 'syn' | 'ant' | 'trg'
  | 'bga' | 'bgb' | 'jja' | 'jjb'
  | 'spc' | 'gen' | 'com' | 'par'
  | 'hom' | 'cns' | 'phrases'

export interface WordRow {
  id: number
  word: string
  num_syllables: number | null
  created_at: string
}

export interface WordRelationRow {
  id: number
  word_id: number
  related_word: string
  relation_type: RelationType
  related_num_syllables: number | null
  source: string
  created_at: string
}

export interface UserRow {
  id: string
  email: string
  display_name: string | null
  tier: 'free' | 'basic' | 'pro'
  api_uses_this_month: number
  billing_cycle_start: string | null
  created_at: string
  last_active_at: string
}
