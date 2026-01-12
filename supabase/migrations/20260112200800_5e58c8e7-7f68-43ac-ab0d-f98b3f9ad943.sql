
-- Enum para tipo de plano
CREATE TYPE public.plano_tipo AS ENUM ('free', 'pro');

-- Enum para status de pagamento
CREATE TYPE public.pagamento_status AS ENUM ('pendente', 'pago', 'cancelado');

-- Adicionar campos de monetização aos transportadores
ALTER TABLE public.transportadores 
ADD COLUMN plano_tipo plano_tipo NOT NULL DEFAULT 'free',
ADD COLUMN plano_ativo_ate TIMESTAMP WITH TIME ZONE,
ADD COLUMN destaque_mapa BOOLEAN NOT NULL DEFAULT false;

-- Tabela de pagamentos/comissões
CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transportador_id UUID NOT NULL REFERENCES public.transportadores(id),
  frete_id UUID REFERENCES public.fretes(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('comissao', 'assinatura')),
  valor_base NUMERIC(10,2),
  percentual_comissao NUMERIC(5,2) DEFAULT 8.00,
  valor_comissao NUMERIC(10,2),
  valor_total NUMERIC(10,2) NOT NULL,
  status pagamento_status NOT NULL DEFAULT 'pendente',
  referencia_externa VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pago_em TIMESTAMP WITH TIME ZONE,
  observacoes TEXT
);

-- Adicionar campo de monetização ao contrato
ALTER TABLE public.contratos
ADD COLUMN tipo_monetizacao VARCHAR(20) DEFAULT 'comissao' CHECK (tipo_monetizacao IN ('comissao', 'assinatura')),
ADD COLUMN pagamento_id UUID REFERENCES public.pagamentos(id);

-- Adicionar campo de status financeiro ao frete
ALTER TABLE public.fretes
ADD COLUMN pagamento_confirmado BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pagamentos
CREATE POLICY "Transportadores can view their own payments"
ON public.pagamentos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM transportadores t 
    WHERE t.id = pagamentos.transportador_id 
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all payments"
ON public.pagamentos FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert payments"
ON public.pagamentos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update payments"
ON public.pagamentos FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Função para verificar se transportador tem plano Pro ativo
CREATE OR REPLACE FUNCTION public.transportador_tem_plano_pro(p_transportador_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM transportadores 
    WHERE id = p_transportador_id 
    AND plano_tipo = 'pro' 
    AND plano_ativo_ate > now()
  );
END;
$$;

-- Função para calcular comissão
CREATE OR REPLACE FUNCTION public.calcular_comissao_frete(p_valor_frete NUMERIC, p_transportador_id UUID)
RETURNS TABLE(valor_comissao NUMERIC, percentual NUMERIC, tipo TEXT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF transportador_tem_plano_pro(p_transportador_id) THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 'assinatura'::TEXT;
  ELSE
    RETURN QUERY SELECT (p_valor_frete * 0.08)::NUMERIC, 8.00::NUMERIC, 'comissao'::TEXT;
  END IF;
END;
$$;

-- Função para verificar se frete pode avançar (pagamento confirmado ou Pro)
CREATE OR REPLACE FUNCTION public.frete_pode_avancar(p_frete_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transportador_id UUID;
  v_pagamento_confirmado BOOLEAN;
BEGIN
  SELECT transportador_id, pagamento_confirmado 
  INTO v_transportador_id, v_pagamento_confirmado
  FROM fretes WHERE id = p_frete_id;
  
  -- Pode avançar se pagamento confirmado OU tem plano Pro ativo
  RETURN v_pagamento_confirmado OR transportador_tem_plano_pro(v_transportador_id);
END;
$$;

-- Função para criar pagamento de comissão
CREATE OR REPLACE FUNCTION public.criar_pagamento_comissao(
  p_frete_id UUID,
  p_transportador_id UUID,
  p_valor_frete NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pagamento_id UUID;
  v_valor_comissao NUMERIC;
  v_percentual NUMERIC;
  v_tipo TEXT;
BEGIN
  -- Calcular comissão
  SELECT * INTO v_valor_comissao, v_percentual, v_tipo
  FROM calcular_comissao_frete(p_valor_frete, p_transportador_id);
  
  -- Se for Pro, não cria pagamento de comissão
  IF v_tipo = 'assinatura' THEN
    -- Marca frete como pago automaticamente
    UPDATE fretes SET pagamento_confirmado = true WHERE id = p_frete_id;
    RETURN NULL;
  END IF;
  
  -- Criar registro de pagamento
  INSERT INTO pagamentos (
    transportador_id,
    frete_id,
    tipo,
    valor_base,
    percentual_comissao,
    valor_comissao,
    valor_total,
    status
  ) VALUES (
    p_transportador_id,
    p_frete_id,
    'comissao',
    p_valor_frete,
    v_percentual,
    v_valor_comissao,
    v_valor_comissao,
    'pendente'
  ) RETURNING id INTO v_pagamento_id;
  
  RETURN v_pagamento_id;
END;
$$;

-- Função para criar assinatura Pro
CREATE OR REPLACE FUNCTION public.criar_assinatura_pro(p_transportador_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pagamento_id UUID;
BEGIN
  -- Criar registro de pagamento da assinatura
  INSERT INTO pagamentos (
    transportador_id,
    tipo,
    valor_total,
    status
  ) VALUES (
    p_transportador_id,
    'assinatura',
    1500.00, -- Valor à vista
    'pendente'
  ) RETURNING id INTO v_pagamento_id;
  
  RETURN v_pagamento_id;
END;
$$;

-- Função para confirmar pagamento
CREATE OR REPLACE FUNCTION public.confirmar_pagamento(p_pagamento_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pagamento RECORD;
BEGIN
  SELECT * INTO v_pagamento FROM pagamentos WHERE id = p_pagamento_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Atualizar status do pagamento
  UPDATE pagamentos 
  SET status = 'pago', pago_em = now() 
  WHERE id = p_pagamento_id;
  
  -- Se for comissão, liberar o frete
  IF v_pagamento.tipo = 'comissao' AND v_pagamento.frete_id IS NOT NULL THEN
    UPDATE fretes SET pagamento_confirmado = true WHERE id = v_pagamento.frete_id;
    
    -- Atualizar contrato com pagamento_id
    UPDATE contratos SET pagamento_id = p_pagamento_id WHERE frete_id = v_pagamento.frete_id;
  END IF;
  
  -- Se for assinatura, ativar plano Pro
  IF v_pagamento.tipo = 'assinatura' THEN
    UPDATE transportadores 
    SET 
      plano_tipo = 'pro',
      plano_ativo_ate = now() + INTERVAL '1 year',
      destaque_mapa = true
    WHERE id = v_pagamento.transportador_id;
    
    -- Liberar todos os fretes pendentes deste transportador
    UPDATE fretes 
    SET pagamento_confirmado = true 
    WHERE transportador_id = v_pagamento.transportador_id 
    AND pagamento_confirmado = false;
  END IF;
  
  -- Registrar auditoria
  PERFORM registrar_auditoria(
    'pagamento_confirmado',
    'pagamentos',
    p_pagamento_id,
    NULL,
    jsonb_build_object('tipo', v_pagamento.tipo, 'valor', v_pagamento.valor_total)
  );
  
  RETURN true;
END;
$$;

-- Trigger para atualizar destaque_mapa quando plano expira
CREATE OR REPLACE FUNCTION public.verificar_plano_expirado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plano_ativo_ate < now() AND OLD.plano_tipo = 'pro' THEN
    NEW.plano_tipo := 'free';
    NEW.destaque_mapa := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_plano_expirado
BEFORE UPDATE ON transportadores
FOR EACH ROW
EXECUTE FUNCTION verificar_plano_expirado();
