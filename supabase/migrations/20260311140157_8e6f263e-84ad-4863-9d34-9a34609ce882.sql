
-- Rate limiting table
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE(key)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role only" ON public.rate_limits FOR ALL TO service_role USING (true);

-- Rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_now timestamp with time zone := now();
BEGIN
  -- Try to get existing record
  SELECT * INTO v_record FROM rate_limits WHERE key = p_key;
  
  IF NOT FOUND THEN
    INSERT INTO rate_limits (key, window_start, request_count)
    VALUES (p_key, v_now, 1)
    ON CONFLICT (key) DO UPDATE SET
      request_count = CASE
        WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::interval < v_now
        THEN 1
        ELSE rate_limits.request_count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::interval < v_now
        THEN v_now
        ELSE rate_limits.window_start
      END;
    RETURN true;
  END IF;
  
  -- Check if window expired
  IF v_record.window_start + (p_window_seconds || ' seconds')::interval < v_now THEN
    UPDATE rate_limits SET window_start = v_now, request_count = 1 WHERE key = p_key;
    RETURN true;
  END IF;
  
  -- Check if under limit
  IF v_record.request_count < p_max_requests THEN
    UPDATE rate_limits SET request_count = request_count + 1 WHERE key = p_key;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Cleanup old entries periodically
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour';
$$;

-- LGPD: Delete user data function
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  
  -- Only the user themselves or an admin can delete
  IF v_caller_id != p_user_id AND NOT has_role(v_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas o próprio usuário ou admin pode solicitar exclusão';
  END IF;
  
  -- Log the deletion request for audit (before deleting data)
  INSERT INTO auditoria (user_id, user_email, acao, tabela, registro_id, dados_novos)
  SELECT p_user_id, u.email, 'lgpd_exclusao_dados', 'usuarios', p_user_id, 
         jsonb_build_object('motivo', 'Direito ao esquecimento - LGPD Art. 18')
  FROM auth.users u WHERE u.id = p_user_id;
  
  -- 1. Delete documents from storage (records only, files need edge function)
  DELETE FROM document_verifications WHERE user_id = p_user_id;
  DELETE FROM documentos WHERE user_id = p_user_id;
  
  -- 2. Anonymize produtores (keep financial references)
  UPDATE produtores SET
    nome = 'Usuário Removido',
    telefone = '00000000000',
    cpf_cnpj = NULL,
    cidade = NULL,
    estado = NULL
  WHERE user_id = p_user_id;
  
  -- 3. Anonymize transportadores
  UPDATE transportadores SET
    nome = 'Usuário Removido',
    telefone = '00000000000',
    cpf_cnpj = NULL,
    whatsapp = NULL,
    placa_veiculo = NULL,
    latitude = NULL,
    longitude = NULL,
    regiao_atendimento = NULL
  WHERE user_id = p_user_id;
  
  -- 4. Anonymize driver_profiles
  UPDATE driver_profiles SET
    name = 'Usuário Removido',
    cpf = '00000000000',
    phone = '00000000000',
    cnh_number = NULL,
    cnh_category = NULL,
    active = false
  WHERE user_id = p_user_id;
  
  -- 5. Anonymize producer_profiles
  UPDATE producer_profiles SET
    name = 'Usuário Removido',
    phone = '00000000000',
    cpf_cnpj = NULL,
    city = NULL,
    state = NULL
  WHERE user_id = p_user_id;
  
  -- 6. Delete notifications
  DELETE FROM notificacoes WHERE user_id = p_user_id;
  
  -- 7. Delete chat messages (anonymize content)
  UPDATE mensagens_chat SET
    conteudo = '[Mensagem removida - LGPD]',
    arquivo_url = NULL,
    arquivo_tipo = NULL
  WHERE sender_user_id = p_user_id;
  
  -- 8. Delete security logs (except audit trail)
  DELETE FROM security_logs WHERE user_id = p_user_id;
  
  -- 9. Delete email logs
  DELETE FROM email_logs WHERE user_id = p_user_id;
  
  -- 10. Delete capabilities and roles
  DELETE FROM user_capabilities WHERE user_id = p_user_id;
  DELETE FROM user_roles WHERE user_id = p_user_id;
  
  -- 11. Delete terms acceptance
  DELETE FROM aceites_termos WHERE user_id = p_user_id;
  
  -- 12. Delete reports filed by user (keep reports against user for compliance)
  DELETE FROM reports WHERE reporter_id = p_user_id;
  
  -- 13. Delete suspensions
  DELETE FROM suspensoes WHERE user_id = p_user_id;
  
  -- 14. Anonymize profile
  UPDATE profiles SET email = 'removed@lgpd.local' WHERE id = p_user_id;
  
  -- NOTE: pagamentos and contratos are KEPT for legal/fiscal requirements
  -- NOTE: fretes are KEPT but producer/transportador data is already anonymized
  -- NOTE: auth.users deletion must be done via edge function (admin API)
  
  RETURN true;
END;
$$;
