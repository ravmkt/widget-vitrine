ALTER TABLE public.lives
  ADD COLUMN IF NOT EXISTS appearance_template_id text DEFAULT 'preset_padrao',
  ADD COLUMN IF NOT EXISTS live_widget_config jsonb,
  ADD COLUMN IF NOT EXISTS live_player_config jsonb;
