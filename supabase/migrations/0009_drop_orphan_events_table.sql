-- Remove tabela orfa 'events', sem uso no codigo, RLS presente mas 0 linhas.
-- Ja removida manualmente do banco remoto em 19/08/2026 -- este arquivo apenas
-- documenta a mudanca para fins de historico de migrations.
DROP TABLE IF EXISTS public.events;
