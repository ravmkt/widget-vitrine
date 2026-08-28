-- Adiciona a coluna thumbnail_file_size à tabela de videos se ela não existir
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS thumbnail_file_size bigint DEFAULT 0;

-- Adiciona um comentário explicativo no banco (boa prática de engenharia)
COMMENT ON COLUMN public.videos.thumbnail_file_size IS 'Tamanho em bytes do arquivo de thumbnail gerado e hospedado no Supabase Storage';
