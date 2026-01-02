-- Remover a view com SECURITY DEFINER
DROP VIEW IF EXISTS public.transportadores_directory;

-- Criar função segura para retornar dados públicos dos transportadores
CREATE OR REPLACE FUNCTION public.get_transportadores_directory()
RETURNS TABLE (
  id uuid,
  nome text,
  tipo_animal text,
  regiao_atendimento text,
  capacidade_animais integer,
  tipo_caminhao text,
  ativo boolean,
  latitude double precision,
  longitude double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.nome,
    t.tipo_animal,
    t.regiao_atendimento,
    t.capacidade_animais,
    t.tipo_caminhao,
    t.ativo,
    t.latitude,
    t.longitude
  FROM public.transportadores t
  WHERE t.ativo = true;
$$;