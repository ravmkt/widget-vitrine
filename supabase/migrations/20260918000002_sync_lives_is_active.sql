-- Garante que is_active sempre reflita o status = 'live', independente do caminho de update usado no app
CREATE OR REPLACE FUNCTION public.sync_lives_is_active()
RETURNS trigger AS $$
BEGIN
  NEW.is_active := (NEW.status = 'live');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_lives_is_active ON public.lives;
CREATE TRIGGER trg_sync_lives_is_active
  BEFORE INSERT OR UPDATE ON public.lives
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lives_is_active();

-- Corrige registros já existentes que estejam fora de sincronia
UPDATE public.lives SET is_active = (status = 'live') WHERE is_active <> (status = 'live');
