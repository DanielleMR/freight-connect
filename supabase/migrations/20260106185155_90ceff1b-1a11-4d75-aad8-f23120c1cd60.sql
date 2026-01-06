-- Adicionar novos campos de cotação na tabela fretes
ALTER TABLE public.fretes 
ADD COLUMN IF NOT EXISTS tipo_cobranca text DEFAULT 'valor_fechado',
ADD COLUMN IF NOT EXISTS distancia_estimada numeric,
ADD COLUMN IF NOT EXISTS observacoes_valor text,
ADD COLUMN IF NOT EXISTS valor_contraproposta numeric;