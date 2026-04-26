-- WS11: relevance weights on word_relations
-- Used by the graph "leaf popup" to surface "top 5 / 10 / 20" most relevant tails.
--
-- Datamuse rows: populated from the `score` field returned by the API
--   (raw int, typically 100..1_000_000+; ordering-only, no normalization needed).
-- LLM rows: populated from a per-tail `weight` field the model returns alongside the
--   tail text (0.0–1.0).
-- Legacy rows (pre-migration): NULL — graph treats unknown weight as the lowest rank.

ALTER TABLE word_relations
  ADD COLUMN IF NOT EXISTS weight REAL;
