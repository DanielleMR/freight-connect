-- =====================================================
-- CORREÇÕES ADICIONAIS DE SEGURANÇA
-- =====================================================

-- 1. PROFILES: Adicionar política que requer autenticação
-- (profiles já tem políticas mas precisamos garantir que anônimos não acessem)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- 2. TRANSPORTADORES: Produtores não devem ver dados sensíveis de todos
-- Já existe get_transportadores_directory() que mascara dados, então vamos restringir
DROP POLICY IF EXISTS "Produtores can view transportador directory" ON public.transportadores;
CREATE POLICY "Produtores can view transportador directory" 
ON public.transportadores FOR SELECT 
USING (
  has_role(auth.uid(), 'produtor'::app_role) 
  AND ativo = true
);
-- Nota: O frontend deve usar get_transportadores_directory() que mascara dados

-- 3. CONTRATOS: As políticas já verificam via subquery - estão corretas
-- O scan sugere verificar user_id, mas já verificamos via join

-- 4. MENSAGENS_CHAT: Garantir que sender_user_id não pode ser falsificado
-- Criar trigger para forçar sender_user_id = auth.uid()
CREATE OR REPLACE FUNCTION public.enforce_sender_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.sender_user_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_sender_user_id_trigger ON public.mensagens_chat;
CREATE TRIGGER enforce_sender_user_id_trigger
BEFORE INSERT ON public.mensagens_chat
FOR EACH ROW
EXECUTE FUNCTION enforce_sender_user_id();

-- 5. AVALIACOES: Adicionar constraint única para evitar duplicatas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_avaliacao_por_frete'
  ) THEN
    ALTER TABLE public.avaliacoes 
    ADD CONSTRAINT unique_avaliacao_por_frete UNIQUE (frete_id, produtor_id);
  END IF;
END $$;

-- 6. DOCUMENTOS: Restringir campos que usuários podem atualizar
-- Vamos criar uma função segura para atualização de documentos
CREATE OR REPLACE FUNCTION public.atualizar_documento_usuario(
  p_documento_id uuid,
  p_arquivo_url text,
  p_arquivo_nome text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE documentos
  SET 
    arquivo_url = p_arquivo_url,
    arquivo_nome = p_arquivo_nome,
    updated_at = now()
  WHERE id = p_documento_id
    AND user_id = auth.uid()
    AND status = 'pendente';
  
  RETURN FOUND;
END;
$$;

-- Restringir política de UPDATE de documentos
DROP POLICY IF EXISTS "Users can update their pending documents" ON public.documentos;
CREATE POLICY "Users can update their pending documents" 
ON public.documentos FOR UPDATE 
USING (
  (user_id = auth.uid() AND status = 'pendente'::documento_status) 
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  -- Usuários não-admin não podem alterar status
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN true
    ELSE status = 'pendente'::documento_status
  END
);

-- 7. FRETES: Permitir produtores atualizar seus próprios fretes (apenas alguns campos)
CREATE OR REPLACE FUNCTION public.atualizar_frete_produtor(
  p_frete_id uuid,
  p_quantidade_animais integer DEFAULT NULL,
  p_data_prevista date DEFAULT NULL,
  p_descricao text DEFAULT NULL,
  p_observacoes_valor text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_frete RECORD;
BEGIN
  -- Verificar se o frete pertence ao produtor e está em status editável
  SELECT * INTO v_frete 
  FROM fretes f
  JOIN produtores p ON f.produtor_id = p.id
  WHERE f.id = p_frete_id 
    AND p.user_id = auth.uid()
    AND f.status = 'solicitado';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Atualizar apenas campos permitidos
  UPDATE fretes
  SET 
    quantidade_animais = COALESCE(p_quantidade_animais, quantidade_animais),
    data_prevista = COALESCE(p_data_prevista, data_prevista),
    descricao = COALESCE(p_descricao, descricao),
    observacoes_valor = COALESCE(p_observacoes_valor, observacoes_valor),
    updated_at = now()
  WHERE id = p_frete_id;
  
  RETURN true;
END;
$$;

-- 8. USER_ROLES: Permitir inserção durante cadastro via trigger
-- Já existe função para cadastro, mas vamos garantir
CREATE OR REPLACE FUNCTION public.atribuir_role_usuario(
  p_user_id uuid,
  p_role app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Só permite se for o próprio usuário se atribuindo role
  -- OU se for admin atribuindo para outros
  IF auth.uid() = p_user_id OR has_role(auth.uid(), 'admin'::app_role) THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (p_user_id, p_role)
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Permitir usuários inserirem sua própria role (para cadastro)
CREATE POLICY "Users can insert their own role" 
ON public.user_roles FOR INSERT 
WITH CHECK (auth.uid() = user_id);