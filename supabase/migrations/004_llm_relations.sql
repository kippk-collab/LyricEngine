-- WS11: LLM-powered relations (similes, metaphors, more to follow)
-- Adds lead/tail columns to word_relations so grouped LLM output
-- (e.g. "smile like" -> ["a crack in frozen pavement", "the split in a peach"])
-- can be cached and re-rendered in its original grouped form.
--
-- Existing Datamuse/STANDS4 rows keep lead/tail NULL and use related_word as before.
-- LLM rows populate lead + tail; related_word holds the concatenation for search
-- and for the UNIQUE(word_id, related_word, relation_type) dedup constraint.

ALTER TABLE word_relations
  ADD COLUMN IF NOT EXISTS lead TEXT,
  ADD COLUMN IF NOT EXISTS tail TEXT;

-- Expanded relation_type vocabulary (existing values still valid):
--   sim  = LLM similes   (lead="smile like", tail="a crack in frozen pavement")
--   met  = LLM metaphors (lead="smile was",  tail="a small unpicked lock")
-- Reserved for future LLM types: idm, all, pop, ono, oxy, alit, intf, def, wfam
--
-- Expanded source vocabulary:
--   'llm_haiku' = Anthropic claude-haiku-4-5
--   'llm_opus'  = Anthropic claude-opus-4-7 (reserved, premium tier)
