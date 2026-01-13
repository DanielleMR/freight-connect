-- =====================================================
-- CORREÇÃO DE SEGURANÇA: RLS RESTRITIVO
-- =====================================================

-- 1. REMOVER políticas permissivas existentes
DROP POLICY IF EXISTS "System can insert auditoria" ON public.auditoria;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "System can insert payments" ON public.pagamentos;

-- 2. CORRIGIR política de fretes para produtores (bug: comparava produtor_id com auth.uid())
DROP POLICY IF EXISTS "Produtores can view their own fretes" ON public.fretes;
CREATE POLICY "Produtores can view their own fretes" 
ON public.fretes FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM produtores p 
    WHERE p.id = fretes.produtor_id 
    AND p.user_id = auth.uid()
  )
);

-- 3. Criar função segura para inserir auditoria (security definer)
CREATE OR REPLACE FUNCTION public.inserir_auditoria_sistema(
  p_acao text,
  p_tabela text,
  p_registro_id uuid DEFAULT NULL,
  p_dados_anteriores jsonb DEFAULT NULL,
  p_dados_novos jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();
  
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  INSERT INTO public.auditoria (user_id, user_email, acao, tabela, registro_id, dados_anteriores, dados_novos)
  VALUES (v_user_id, v_user_email, p_acao, p_tabela, p_registro_id, p_dados_anteriores, p_dados_novos)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- 4. Criar política restritiva para auditoria (apenas via função)
CREATE POLICY "Insert auditoria via function only" 
ON public.auditoria FOR INSERT 
WITH CHECK (false); -- Bloqueado via RLS, só funciona via security definer

-- 5. Criar política restritiva para notificações (apenas via função)
CREATE POLICY "Insert notifications via function only" 
ON public.notificacoes FOR INSERT 
WITH CHECK (false); -- Bloqueado via RLS, só funciona via security definer (criar_notificacao já existe)

-- 6. Criar política restritiva para pagamentos (apenas via função RPC)
CREATE POLICY "Insert payments via function only" 
ON public.pagamentos FOR INSERT 
WITH CHECK (false); -- Bloqueado via RLS, só funciona via security definer (criar_pagamento_comissao/criar_assinatura_pro)

-- =====================================================
-- ADICIONAR auth.uid() IS NOT NULL em SELECT
-- Para proteger contra queries anônimas
-- =====================================================

-- profiles já tem políticas corretas

-- produtores - adicionar verificação de autenticação
DROP POLICY IF EXISTS "Produtores can view their own data" ON public.produtores;
CREATE POLICY "Produtores can view their own data" 
ON public.produtores FOR SELECT 
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- transportadores - manter políticas existentes (já requerem role ou user_id)

-- fretes - já corrigido acima

-- mensagens_chat - já tem verificação via join

-- documentos - já tem verificação de user_id ou admin

-- contratos - já tem verificação via join ou admin

-- pagamentos - já tem verificação via join ou admin

-- notificacoes - adicionar verificação
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notificacoes;
CREATE POLICY "Users can view their own notifications" 
ON public.notificacoes FOR SELECT 
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- auditoria - já tem verificação de admin

-- user_roles - adicionar verificação
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- avaliacoes - restringir a usuários autenticados
DROP POLICY IF EXISTS "Anyone can view avaliacoes" ON public.avaliacoes;
CREATE POLICY "Authenticated users can view avaliacoes" 
ON public.avaliacoes FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- FUNÇÃO PARA VALIDAR AVANÇO DE FRETE COM PAGAMENTO
-- (atualizar para ser mais restritiva)
-- =====================================================

CREATE OR REPLACE FUNCTION public.validar_e_avancar_frete(
  p_frete_id uuid,
  p_novo_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_frete RECORD;
  v_pode_avancar BOOLEAN;
BEGIN
  -- Buscar frete
  SELECT * INTO v_frete FROM fretes WHERE id = p_frete_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Frete não encontrado';
  END IF;
  
  -- Verificar se pode avançar
  v_pode_avancar := frete_pode_avancar(p_frete_id);
  
  -- Para status que requerem pagamento
  IF p_novo_status IN ('em_andamento', 'concluido') THEN
    IF NOT v_pode_avancar THEN
      RAISE EXCEPTION 'Pagamento não confirmado. Complete o pagamento para avançar.';
    END IF;
  END IF;
  
  -- Atualizar status
  UPDATE fretes 
  SET status = p_novo_status::frete_status, updated_at = now()
  WHERE id = p_frete_id;
  
  -- Registrar auditoria
  PERFORM inserir_auditoria_sistema(
    'status_alterado',
    'fretes',
    p_frete_id,
    jsonb_build_object('status', v_frete.status),
    jsonb_build_object('status', p_novo_status)
  );
  
  RETURN true;
END;
$$;