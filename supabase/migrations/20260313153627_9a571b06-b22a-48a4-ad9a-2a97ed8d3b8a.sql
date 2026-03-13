
-- Function: get public fretes (no sensitive data)
CREATE OR REPLACE FUNCTION public.get_fretes_disponiveis(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  public_id text,
  origem text,
  destino text,
  tipo_animal text,
  quantidade_animais integer,
  data_prevista date,
  status text,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    f.public_id,
    -- Mask exact addresses, show only city/state
    split_part(COALESCE(f.origem, ''), ',', 1) as origem,
    split_part(COALESCE(f.destino, ''), ',', 1) as destino,
    f.tipo_animal,
    f.quantidade_animais,
    f.data_prevista,
    f.status::text,
    f.created_at,
    count(*) OVER() as total_count
  FROM public.fretes f
  WHERE f.status = 'solicitado'
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Function: get transportador reputation stats
CREATE OR REPLACE FUNCTION public.get_transportador_reputacao(p_transportador_id uuid)
RETURNS TABLE(
  media_nota numeric,
  total_avaliacoes bigint,
  total_fretes_concluidos bigint,
  docs_verificados boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(
      (SELECT ROUND(AVG(a.nota)::numeric, 1) FROM avaliacoes a WHERE a.transportador_id = p_transportador_id),
      0
    ) as media_nota,
    (SELECT COUNT(*) FROM avaliacoes a WHERE a.transportador_id = p_transportador_id) as total_avaliacoes,
    (SELECT COUNT(*) FROM fretes f WHERE f.transportador_id = p_transportador_id AND f.status = 'concluido') as total_fretes_concluidos,
    (SELECT EXISTS (
      SELECT 1 FROM documentos d 
      JOIN transportadores t ON t.user_id = d.user_id 
      WHERE t.id = p_transportador_id 
      AND d.status = 'aprovado'
      AND d.tipo_documento IN ('cnh', 'crlv')
      GROUP BY t.id
      HAVING COUNT(DISTINCT d.tipo_documento) >= 2
    )) as docs_verificados;
$$;

-- Enhanced directory function with reputation, filters, search, pagination
CREATE OR REPLACE FUNCTION public.get_transportadores_directory_v2(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_tipo_animal text DEFAULT NULL,
  p_regiao text DEFAULT NULL,
  p_capacidade_min integer DEFAULT NULL,
  p_avaliacao_min numeric DEFAULT NULL
)
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
  longitude double precision,
  media_nota numeric,
  total_avaliacoes bigint,
  total_fretes bigint,
  docs_verificados boolean,
  destaque_mapa boolean,
  total_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH rep AS (
    SELECT 
      a.transportador_id,
      ROUND(AVG(a.nota)::numeric, 1) as media,
      COUNT(*) as total
    FROM avaliacoes a
    GROUP BY a.transportador_id
  ),
  fretes_count AS (
    SELECT transportador_id, COUNT(*) as cnt
    FROM fretes WHERE status = 'concluido'
    GROUP BY transportador_id
  ),
  docs_check AS (
    SELECT t.id as tid, 
      CASE WHEN COUNT(DISTINCT d.tipo_documento) >= 2 THEN true ELSE false END as verified
    FROM transportadores t
    LEFT JOIN documentos d ON d.user_id = t.user_id AND d.status = 'aprovado' AND d.tipo_documento IN ('cnh', 'crlv')
    GROUP BY t.id
  )
  SELECT 
    t.id,
    t.public_id,
    CASE WHEN length(t.nome) > 2 THEN left(t.nome, 2) || repeat('*', length(t.nome) - 2) ELSE t.nome END as nome,
    t.tipo_animal,
    t.regiao_atendimento,
    t.capacidade_animais,
    t.tipo_caminhao,
    t.ativo,
    CASE WHEN t.latitude IS NOT NULL THEN round(t.latitude::numeric, 1)::double precision ELSE NULL END as latitude,
    CASE WHEN t.longitude IS NOT NULL THEN round(t.longitude::numeric, 1)::double precision ELSE NULL END as longitude,
    COALESCE(r.media, 0) as media_nota,
    COALESCE(r.total, 0) as total_avaliacoes,
    COALESCE(fc.cnt, 0) as total_fretes,
    COALESCE(dc.verified, false) as docs_verificados,
    t.destaque_mapa,
    count(*) OVER() as total_count
  FROM transportadores t
  LEFT JOIN rep r ON r.transportador_id = t.id
  LEFT JOIN fretes_count fc ON fc.transportador_id = t.id
  LEFT JOIN docs_check dc ON dc.tid = t.id
  WHERE t.ativo = true
    AND (p_search IS NULL OR (
      t.nome ILIKE '%' || p_search || '%' 
      OR t.regiao_atendimento ILIKE '%' || p_search || '%'
      OR t.tipo_animal ILIKE '%' || p_search || '%'
      OR t.tipo_caminhao ILIKE '%' || p_search || '%'
    ))
    AND (p_tipo_animal IS NULL OR t.tipo_animal ILIKE '%' || p_tipo_animal || '%')
    AND (p_regiao IS NULL OR t.regiao_atendimento ILIKE '%' || p_regiao || '%')
    AND (p_capacidade_min IS NULL OR t.capacidade_animais >= p_capacidade_min)
    AND (p_avaliacao_min IS NULL OR COALESCE(r.media, 0) >= p_avaliacao_min)
  ORDER BY t.destaque_mapa DESC, COALESCE(r.media, 0) DESC, COALESCE(fc.cnt, 0) DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Trigger function to send email on frete status change
CREATE OR REPLACE FUNCTION public.trigger_email_frete_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email_type text;
  v_user_id uuid;
  v_user_email text;
  v_user_name text;
BEGIN
  -- Only fire on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine email type and recipient
  IF NEW.status = 'aceito' THEN
    v_email_type := 'frete_aceito';
    -- Notify producer
    SELECT p.user_id, u.email, p.nome INTO v_user_id, v_user_email, v_user_name
    FROM produtores p JOIN auth.users u ON u.id = p.user_id
    WHERE p.id = NEW.produtor_id;
  END IF;

  -- We only handle 'aceito' in trigger; other events handled in edge functions
  IF v_email_type IS NOT NULL AND v_user_email IS NOT NULL THEN
    -- Insert into email_logs for async processing
    INSERT INTO email_logs (user_id, email_type, subject, recipient, status, metadata)
    VALUES (
      v_user_id,
      v_email_type,
      'Frete aceito – FreteBoi',
      v_user_email,
      'queued',
      jsonb_build_object(
        'frete_public_id', NEW.public_id,
        'origem', NEW.origem,
        'destino', NEW.destino,
        'recipient_name', v_user_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for frete status email
DROP TRIGGER IF EXISTS trigger_email_on_frete_status ON fretes;
CREATE TRIGGER trigger_email_on_frete_status
  AFTER UPDATE ON fretes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_email_frete_status();

-- Trigger function for document status emails
CREATE OR REPLACE FUNCTION public.trigger_email_documento_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email_type text;
  v_user_email text;
  v_user_name text;
BEGIN
  IF OLD.status = 'pendente' AND NEW.status IN ('aprovado', 'reprovado') THEN
    IF NEW.status = 'aprovado' THEN
      v_email_type := 'documento_aprovado';
    ELSE
      v_email_type := 'documento_rejeitado';
    END IF;

    SELECT u.email INTO v_user_email FROM auth.users u WHERE u.id = NEW.user_id;
    
    -- Try to get name
    SELECT COALESCE(
      (SELECT nome FROM produtores WHERE user_id = NEW.user_id LIMIT 1),
      (SELECT nome FROM transportadores WHERE user_id = NEW.user_id LIMIT 1),
      'Usuário'
    ) INTO v_user_name;

    INSERT INTO email_logs (user_id, email_type, subject, recipient, status, metadata)
    VALUES (
      NEW.user_id,
      v_email_type,
      CASE WHEN NEW.status = 'aprovado' THEN 'Documento aprovado – FreteBoi' ELSE 'Documento reprovado – FreteBoi' END,
      v_user_email,
      'queued',
      jsonb_build_object(
        'tipo_documento', NEW.tipo_documento::text,
        'motivo_reprovacao', COALESCE(NEW.motivo_reprovacao, ''),
        'recipient_name', v_user_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_email_on_documento_status ON documentos;
CREATE TRIGGER trigger_email_on_documento_status
  AFTER UPDATE ON documentos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_email_documento_status();
