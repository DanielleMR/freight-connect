
-- ============================================
-- 1. Adicionar campos obrigatórios à tabela fretes
-- ============================================
ALTER TABLE public.fretes 
ADD COLUMN IF NOT EXISTS valor_frete DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS data_prevista DATE,
ADD COLUMN IF NOT EXISTS tipo_animal TEXT;

-- ============================================
-- 2. Adicionar campos ao transportador para whatsapp e CPF/CNPJ
-- ============================================
ALTER TABLE public.transportadores
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;

-- ============================================
-- 3. Criar tabela de auditoria
-- ============================================
CREATE TABLE IF NOT EXISTS public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  acao TEXT NOT NULL,
  tabela TEXT NOT NULL,
  registro_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all auditoria"
ON public.auditoria
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert auditoria"
ON public.auditoria
FOR INSERT
WITH CHECK (true);

-- ============================================
-- 4. Criar tabela de notificações
-- ============================================
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN DEFAULT false,
  referencia_id UUID,
  referencia_tipo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notificacoes
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notificacoes
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON public.notificacoes
FOR INSERT
WITH CHECK (true);

-- ============================================
-- 5. Criar tabela de avaliações
-- ============================================
CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frete_id UUID NOT NULL REFERENCES public.fretes(id) ON DELETE CASCADE,
  transportador_id UUID NOT NULL REFERENCES public.transportadores(id) ON DELETE CASCADE,
  produtor_id UUID NOT NULL,
  nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(frete_id)
);

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Produtores can create avaliacoes for their fretes"
ON public.avaliacoes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM produtores p
    WHERE p.id = avaliacoes.produtor_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view avaliacoes"
ON public.avaliacoes
FOR SELECT
USING (true);

-- ============================================
-- 6. Criar função para registrar auditoria
-- ============================================
CREATE OR REPLACE FUNCTION public.registrar_auditoria(
  p_acao TEXT,
  p_tabela TEXT,
  p_registro_id UUID DEFAULT NULL,
  p_dados_anteriores JSONB DEFAULT NULL,
  p_dados_novos JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();
  
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  INSERT INTO public.auditoria (user_id, user_email, acao, tabela, registro_id, dados_anteriores, dados_novos)
  VALUES (v_user_id, v_user_email, p_acao, p_tabela, p_registro_id, p_dados_anteriores, p_dados_novos);
END;
$$;

-- ============================================
-- 7. Criar função para criar notificação
-- ============================================
CREATE OR REPLACE FUNCTION public.criar_notificacao(
  p_user_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_mensagem TEXT DEFAULT NULL,
  p_referencia_id UUID DEFAULT NULL,
  p_referencia_tipo TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo)
  VALUES (p_user_id, p_tipo, p_titulo, p_mensagem, p_referencia_id, p_referencia_tipo)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- ============================================
-- 8. Trigger para notificar transportador sobre novo frete
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_transportador_novo_frete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transportador_user_id UUID;
BEGIN
  -- Buscar user_id do transportador
  SELECT user_id INTO v_transportador_user_id
  FROM transportadores
  WHERE id = NEW.transportador_id;
  
  IF v_transportador_user_id IS NOT NULL THEN
    PERFORM criar_notificacao(
      v_transportador_user_id,
      'novo_frete',
      'Novo Frete Disponível',
      'Você recebeu uma nova solicitação de frete de ' || NEW.origem || ' para ' || NEW.destino,
      NEW.id,
      'frete'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_novo_frete ON public.fretes;
CREATE TRIGGER trigger_notify_novo_frete
AFTER INSERT ON public.fretes
FOR EACH ROW
EXECUTE FUNCTION notify_transportador_novo_frete();

-- ============================================
-- 9. Trigger para notificar produtor sobre status do frete
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_produtor_status_frete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_produtor_user_id UUID;
  v_titulo TEXT;
  v_mensagem TEXT;
BEGIN
  IF OLD.status != NEW.status THEN
    -- Buscar user_id do produtor
    SELECT user_id INTO v_produtor_user_id
    FROM produtores
    WHERE id = NEW.produtor_id;
    
    IF NEW.status = 'aceito' THEN
      v_titulo := 'Frete Aceito!';
      v_mensagem := 'Seu frete de ' || COALESCE(NEW.origem, '') || ' para ' || COALESCE(NEW.destino, '') || ' foi aceito pelo transportador.';
    ELSIF NEW.status = 'recusado' THEN
      v_titulo := 'Frete Recusado';
      v_mensagem := 'Seu frete de ' || COALESCE(NEW.origem, '') || ' para ' || COALESCE(NEW.destino, '') || ' foi recusado pelo transportador.';
    ELSIF NEW.status = 'em_andamento' THEN
      v_titulo := 'Frete em Andamento';
      v_mensagem := 'Seu frete de ' || COALESCE(NEW.origem, '') || ' para ' || COALESCE(NEW.destino, '') || ' está em andamento.';
    ELSIF NEW.status = 'concluido' THEN
      v_titulo := 'Frete Concluído';
      v_mensagem := 'Seu frete de ' || COALESCE(NEW.origem, '') || ' para ' || COALESCE(NEW.destino, '') || ' foi concluído com sucesso!';
    END IF;
    
    IF v_produtor_user_id IS NOT NULL AND v_titulo IS NOT NULL THEN
      PERFORM criar_notificacao(
        v_produtor_user_id,
        'status_frete',
        v_titulo,
        v_mensagem,
        NEW.id,
        'frete'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_status_frete ON public.fretes;
CREATE TRIGGER trigger_notify_status_frete
AFTER UPDATE ON public.fretes
FOR EACH ROW
EXECUTE FUNCTION notify_produtor_status_frete();

-- ============================================
-- 10. Habilitar realtime para notificações
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;

-- ============================================
-- 11. Policy para transportadores poderem se auto-cadastrar
-- ============================================
CREATE POLICY "Users can insert their own transportador profile"
ON public.transportadores
FOR INSERT
WITH CHECK (user_id = auth.uid());
