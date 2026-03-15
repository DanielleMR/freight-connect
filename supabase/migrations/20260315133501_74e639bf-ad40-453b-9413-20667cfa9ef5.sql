
-- ==========================================
-- 1. FRETE SUGGESTIONS TABLE (Matching)
-- ==========================================
CREATE TABLE public.frete_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  frete_id uuid NOT NULL REFERENCES public.fretes(id) ON DELETE CASCADE,
  transportador_id uuid NOT NULL REFERENCES public.transportadores(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  score_proximidade numeric DEFAULT 0,
  score_avaliacao numeric DEFAULT 0,
  score_fretes numeric DEFAULT 0,
  score_resposta numeric DEFAULT 0,
  notificado boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(frete_id, transportador_id)
);

ALTER TABLE public.frete_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage frete_suggestions" ON public.frete_suggestions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Produtores can view suggestions for their fretes" ON public.frete_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fretes f
      JOIN produtores p ON p.id = f.produtor_id
      WHERE f.id = frete_suggestions.frete_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Transportadores can view their own suggestions" ON public.frete_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transportadores t
      WHERE t.id = frete_suggestions.transportador_id AND t.user_id = auth.uid()
    )
  );

CREATE INDEX idx_frete_suggestions_frete_id ON public.frete_suggestions(frete_id);
CREATE INDEX idx_frete_suggestions_transportador_id ON public.frete_suggestions(transportador_id);

-- ==========================================
-- 2. FRAUD FLAGS TABLE
-- ==========================================
CREATE TABLE public.fraud_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo_alerta text NOT NULL,
  descricao text NOT NULL,
  severidade text NOT NULL DEFAULT 'medio',
  status text NOT NULL DEFAULT 'pendente',
  revisado_por uuid,
  revisado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud_flags" ON public.fraud_flags
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_fraud_flags_user_id ON public.fraud_flags(user_id);
CREATE INDEX idx_fraud_flags_status ON public.fraud_flags(status);

-- ==========================================
-- 3. MATCH TRANSPORTADORES FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.match_transportadores(p_frete_id uuid, p_limit integer DEFAULT 5)
RETURNS TABLE(
  transportador_id uuid,
  nome text,
  score numeric,
  score_proximidade numeric,
  score_avaliacao numeric,
  score_fretes numeric,
  score_resposta numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_frete RECORD;
  v_origem_parts text[];
BEGIN
  -- Get frete details
  SELECT f.* INTO v_frete FROM fretes f WHERE f.id = p_frete_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Frete não encontrado';
  END IF;

  -- Extract region keywords from origin
  v_origem_parts := string_to_array(COALESCE(v_frete.origem, ''), ',');

  RETURN QUERY
  WITH transportador_stats AS (
    SELECT
      t.id,
      t.nome,
      t.regiao_atendimento,
      t.tipo_animal,
      t.capacidade_animais,
      t.latitude,
      t.longitude,
      COALESCE(
        (SELECT ROUND(AVG(a.nota)::numeric, 1) FROM avaliacoes a WHERE a.transportador_id = t.id),
        0
      ) as media_nota,
      (SELECT COUNT(*) FROM fretes fr WHERE fr.transportador_id = t.id AND fr.status = 'concluido') as total_fretes_concluidos,
      -- Average response time (days between frete creation and acceptance)
      COALESCE(
        (SELECT AVG(EXTRACT(EPOCH FROM (fr.updated_at - fr.created_at)) / 3600)
         FROM fretes fr
         WHERE fr.transportador_id = t.id AND fr.status IN ('aceito', 'em_andamento', 'concluido')
        ), 72
      ) as avg_response_hours,
      -- Current active fretes
      (SELECT COUNT(*) FROM fretes fr WHERE fr.transportador_id = t.id AND fr.status IN ('aceito', 'em_andamento')) as fretes_ativos
    FROM transportadores t
    WHERE t.ativo = true
      AND t.id != v_frete.transportador_id
      -- Filter by animal type compatibility
      AND (t.tipo_animal IS NULL OR t.tipo_animal ILIKE '%' || COALESCE(v_frete.tipo_animal, '') || '%')
      -- Filter by minimum capacity
      AND (t.capacidade_animais IS NULL OR t.capacidade_animais >= COALESCE(v_frete.quantidade_animais, 0))
      -- Exclude suspended users
      AND NOT EXISTS (SELECT 1 FROM suspensoes s WHERE s.user_id = t.user_id AND s.ativo = true)
  )
  SELECT
    ts.id as transportador_id,
    ts.nome,
    -- Total score (weighted)
    ROUND((
      -- Proximity score (40%) - region match
      (CASE
        WHEN ts.regiao_atendimento IS NOT NULL AND v_frete.origem IS NOT NULL
          AND ts.regiao_atendimento ILIKE '%' || COALESCE(v_origem_parts[1], '') || '%'
        THEN 100
        WHEN ts.regiao_atendimento IS NOT NULL AND v_frete.origem IS NOT NULL
          AND ts.regiao_atendimento ILIKE '%' || split_part(COALESCE(v_frete.origem, ''), ' ', 1) || '%'
        THEN 70
        ELSE 30
      END * 0.40) +
      -- Rating score (25%)
      (ts.media_nota * 20 * 0.25) +
      -- Completed fretes score (20%)
      (LEAST(ts.total_fretes_concluidos * 10, 100) * 0.20) +
      -- Response time score (15%) - faster = better
      (CASE
        WHEN ts.avg_response_hours <= 4 THEN 100
        WHEN ts.avg_response_hours <= 12 THEN 80
        WHEN ts.avg_response_hours <= 24 THEN 60
        WHEN ts.avg_response_hours <= 48 THEN 40
        ELSE 20
      END * 0.15)
    )::numeric, 1) as score,
    -- Individual scores
    ROUND((CASE
      WHEN ts.regiao_atendimento IS NOT NULL AND v_frete.origem IS NOT NULL
        AND ts.regiao_atendimento ILIKE '%' || COALESCE(v_origem_parts[1], '') || '%'
      THEN 100 ELSE 30 END)::numeric, 1) as score_proximidade,
    ROUND((ts.media_nota * 20)::numeric, 1) as score_avaliacao,
    ROUND(LEAST(ts.total_fretes_concluidos * 10, 100)::numeric, 1) as score_fretes,
    ROUND((CASE
      WHEN ts.avg_response_hours <= 4 THEN 100
      WHEN ts.avg_response_hours <= 12 THEN 80
      WHEN ts.avg_response_hours <= 24 THEN 60
      ELSE 20
    END)::numeric, 1) as score_resposta
  FROM transportador_stats ts
  WHERE ts.fretes_ativos < 5  -- availability filter
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$;

-- ==========================================
-- 4. DETECT FRAUD FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.detect_fraud_indicators()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_record RECORD;
BEGIN
  -- 1. Duplicate phone numbers across produtores
  FOR v_record IN
    SELECT telefone, array_agg(DISTINCT user_id) as user_ids, COUNT(DISTINCT user_id) as cnt
    FROM (
      SELECT telefone, user_id FROM produtores WHERE telefone != '00000000000'
      UNION ALL
      SELECT telefone, user_id FROM transportadores WHERE telefone != '00000000000'
    ) combined
    GROUP BY telefone HAVING COUNT(DISTINCT user_id) > 1
  LOOP
    INSERT INTO fraud_flags (user_id, tipo_alerta, descricao, severidade)
    SELECT unnest(v_record.user_ids), 'telefone_duplicado',
      'Telefone compartilhado com ' || v_record.cnt || ' contas',
      'alto'
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  -- 2. Duplicate CPF/CNPJ
  FOR v_record IN
    SELECT cpf_cnpj, array_agg(DISTINCT user_id) as user_ids, COUNT(DISTINCT user_id) as cnt
    FROM (
      SELECT cpf_cnpj, user_id FROM produtores WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != ''
      UNION ALL
      SELECT cpf_cnpj, user_id FROM transportadores WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != ''
    ) combined
    GROUP BY cpf_cnpj HAVING COUNT(DISTINCT user_id) > 1
  LOOP
    INSERT INTO fraud_flags (user_id, tipo_alerta, descricao, severidade)
    SELECT unnest(v_record.user_ids), 'cpf_cnpj_duplicado',
      'CPF/CNPJ compartilhado com ' || v_record.cnt || ' contas',
      'critico'
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  -- 3. Mass freight creation (>10 in 1 hour)
  FOR v_record IN
    SELECT f.produtor_id, p.user_id, COUNT(*) as cnt
    FROM fretes f
    JOIN produtores p ON p.id = f.produtor_id
    WHERE f.created_at > now() - interval '1 hour'
    GROUP BY f.produtor_id, p.user_id
    HAVING COUNT(*) > 10
  LOOP
    INSERT INTO fraud_flags (user_id, tipo_alerta, descricao, severidade)
    VALUES (v_record.user_id, 'criacao_massiva_fretes',
      v_record.cnt || ' fretes criados na última hora',
      'alto');
    v_count := v_count + 1;
  END LOOP;

  -- 4. High cancellation rate (>50% of fretes recusados/cancelados, min 5)
  FOR v_record IN
    SELECT p.user_id, 
      COUNT(*) FILTER (WHERE f.status = 'recusado') as recusados,
      COUNT(*) as total
    FROM fretes f
    JOIN produtores p ON p.id = f.produtor_id
    GROUP BY p.user_id
    HAVING COUNT(*) >= 5 
      AND COUNT(*) FILTER (WHERE f.status = 'recusado')::numeric / COUNT(*)::numeric > 0.5
  LOOP
    INSERT INTO fraud_flags (user_id, tipo_alerta, descricao, severidade)
    VALUES (v_record.user_id, 'alto_cancelamento',
      v_record.recusados || ' de ' || v_record.total || ' fretes recusados (>50%)',
      'medio');
    v_count := v_count + 1;
  END LOOP;

  -- 5. Transportadores with recurring negative reviews (avg < 2, min 3 reviews)
  FOR v_record IN
    SELECT t.user_id, ROUND(AVG(a.nota)::numeric, 1) as media, COUNT(*) as total
    FROM avaliacoes a
    JOIN transportadores t ON t.id = a.transportador_id
    GROUP BY t.user_id
    HAVING COUNT(*) >= 3 AND AVG(a.nota) < 2
  LOOP
    INSERT INTO fraud_flags (user_id, tipo_alerta, descricao, severidade)
    VALUES (v_record.user_id, 'avaliacoes_negativas',
      'Nota média ' || v_record.media || ' em ' || v_record.total || ' avaliações',
      'medio');
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ==========================================
-- 5. GET USER RISK SCORE FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_user_risk_score(p_user_id uuid)
RETURNS TABLE(score integer, total_flags integer, flags_criticos integer, flags_altos integer, precisa_revisao boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(
      SUM(CASE severidade
        WHEN 'critico' THEN 40
        WHEN 'alto' THEN 25
        WHEN 'medio' THEN 10
        ELSE 5
      END), 0
    )::integer as score,
    COUNT(*)::integer as total_flags,
    COUNT(*) FILTER (WHERE severidade = 'critico')::integer as flags_criticos,
    COUNT(*) FILTER (WHERE severidade = 'alto')::integer as flags_altos,
    COALESCE(
      SUM(CASE severidade
        WHEN 'critico' THEN 40
        WHEN 'alto' THEN 25
        WHEN 'medio' THEN 10
        ELSE 5
      END), 0
    ) >= 50 as precisa_revisao
  FROM fraud_flags
  WHERE user_id = p_user_id AND status = 'pendente';
$$;

-- ==========================================
-- 6. ESTIMATE FREIGHT PRICE FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.estimate_freight_price(
  p_distancia_km numeric DEFAULT NULL,
  p_tipo_animal text DEFAULT 'bovino',
  p_quantidade integer DEFAULT 1,
  p_urgente boolean DEFAULT false
)
RETURNS TABLE(preco_minimo numeric, preco_medio numeric, preco_maximo numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_custo_km_base numeric := 3.50;
  v_base numeric;
  v_mult_animal numeric := 1.0;
  v_mult_quantidade numeric := 1.0;
  v_mult_urgencia numeric := 1.0;
  v_distancia numeric;
BEGIN
  -- Use provided distance or default
  v_distancia := COALESCE(p_distancia_km, 200);

  -- Animal type multiplier
  v_mult_animal := CASE p_tipo_animal
    WHEN 'equino' THEN 1.30
    WHEN 'bovino' THEN 1.00
    WHEN 'suino' THEN 0.90
    WHEN 'ovino' THEN 0.85
    WHEN 'caprino' THEN 0.85
    ELSE 1.00
  END;

  -- Quantity multiplier (economies of scale)
  v_mult_quantidade := CASE
    WHEN p_quantidade <= 5 THEN 1.20
    WHEN p_quantidade <= 20 THEN 1.00
    WHEN p_quantidade <= 50 THEN 0.95
    ELSE 0.90
  END;

  -- Urgency multiplier
  IF p_urgente THEN
    v_mult_urgencia := 1.25;
  END IF;

  -- Base calculation
  v_base := v_distancia * v_custo_km_base * v_mult_animal * v_mult_quantidade * v_mult_urgencia;

  -- Also factor in historical data
  DECLARE
    v_hist_avg numeric;
  BEGIN
    SELECT AVG(valor_frete) INTO v_hist_avg
    FROM fretes
    WHERE tipo_animal = p_tipo_animal
      AND status IN ('aceito', 'em_andamento', 'concluido')
      AND valor_frete IS NOT NULL
      AND valor_frete > 0
      AND created_at > now() - interval '6 months';

    -- Blend formula with historical if available
    IF v_hist_avg IS NOT NULL AND v_hist_avg > 0 THEN
      v_base := (v_base * 0.6) + (v_hist_avg * 0.4);
    END IF;
  END;

  -- Return min/med/max range
  RETURN QUERY SELECT
    ROUND(v_base * 0.80, 2) as preco_minimo,
    ROUND(v_base, 2) as preco_medio,
    ROUND(v_base * 1.25, 2) as preco_maximo;
END;
$$;
