-- Dropar função existente para recriar com nova assinatura
DROP FUNCTION IF EXISTS public.get_transportadores_directory();

-- Recriar função de diretório com public_id
CREATE OR REPLACE FUNCTION public.get_transportadores_directory()
RETURNS TABLE(
  id uuid, 
  public_id text,
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
    t.public_id,
    -- Mascarar nome para exibição pública (primeiras letras apenas)
    CASE 
      WHEN length(t.nome) > 2 THEN 
        left(t.nome, 2) || repeat('*', length(t.nome) - 2)
      ELSE t.nome 
    END as nome,
    t.tipo_animal,
    t.regiao_atendimento,
    t.capacidade_animais,
    t.tipo_caminhao,
    t.ativo,
    -- Não retornar coordenadas exatas, apenas aproximação
    CASE WHEN t.latitude IS NOT NULL THEN round(t.latitude::numeric, 1)::double precision ELSE NULL END as latitude,
    CASE WHEN t.longitude IS NOT NULL THEN round(t.longitude::numeric, 1)::double precision ELSE NULL END as longitude
  FROM public.transportadores t
  WHERE t.ativo = true;
$$;

-- Função para buscar transportador por public_id
CREATE OR REPLACE FUNCTION public.get_transportador_by_public_id(p_public_id text)
RETURNS TABLE(
  id uuid,
  public_id text,
  nome text,
  tipo_animal text,
  regiao_atendimento text,
  capacidade_animais integer,
  tipo_caminhao text,
  ativo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.public_id,
    -- Mascarar nome
    CASE 
      WHEN length(t.nome) > 2 THEN 
        left(t.nome, 2) || repeat('*', length(t.nome) - 2)
      ELSE t.nome 
    END as nome,
    t.tipo_animal,
    t.regiao_atendimento,
    t.capacidade_animais,
    t.tipo_caminhao,
    t.ativo
  FROM public.transportadores t
  WHERE t.public_id = p_public_id AND t.ativo = true;
$$;

-- Função para buscar frete por public_id com dados mascarados
CREATE OR REPLACE FUNCTION public.get_frete_by_public_id(p_public_id text, p_user_id uuid)
RETURNS TABLE(
  id uuid,
  public_id text,
  origem text,
  destino text,
  tipo_animal text,
  quantidade_animais integer,
  valor_frete numeric,
  data_prevista date,
  status text,
  contrato_aceito boolean,
  transportador_public_id text,
  transportador_nome text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access boolean := false;
  v_is_admin boolean := false;
  v_contract_accepted boolean := false;
BEGIN
  -- Verificar se é admin
  v_is_admin := has_role(p_user_id, 'admin');
  
  -- Verificar acesso ao frete
  SELECT EXISTS (
    SELECT 1 FROM fretes f
    JOIN produtores p ON f.produtor_id = p.id
    WHERE f.public_id = p_public_id AND p.user_id = p_user_id
    UNION
    SELECT 1 FROM fretes f
    JOIN transportadores t ON f.transportador_id = t.id
    WHERE f.public_id = p_public_id AND t.user_id = p_user_id
  ) INTO v_has_access;
  
  IF NOT v_has_access AND NOT v_is_admin THEN
    RETURN;
  END IF;
  
  -- Verificar se contrato foi aceito
  SELECT f.contrato_aceito INTO v_contract_accepted
  FROM fretes f WHERE f.public_id = p_public_id;
  
  RETURN QUERY
  SELECT 
    f.id,
    f.public_id,
    -- Mascarar origem/destino se contrato não aceito
    CASE 
      WHEN v_contract_accepted OR v_is_admin THEN f.origem
      ELSE split_part(f.origem, ' ', 1) || ' - ***'
    END as origem,
    CASE 
      WHEN v_contract_accepted OR v_is_admin THEN f.destino
      ELSE split_part(f.destino, ' ', 1) || ' - ***'
    END as destino,
    f.tipo_animal,
    f.quantidade_animais,
    f.valor_frete,
    f.data_prevista,
    f.status::text,
    f.contrato_aceito,
    t.public_id as transportador_public_id,
    CASE 
      WHEN v_contract_accepted OR v_is_admin THEN t.nome
      ELSE left(t.nome, 2) || repeat('*', greatest(length(t.nome) - 2, 0))
    END as transportador_nome
  FROM fretes f
  JOIN transportadores t ON f.transportador_id = t.id
  WHERE f.public_id = p_public_id;
END;
$$;