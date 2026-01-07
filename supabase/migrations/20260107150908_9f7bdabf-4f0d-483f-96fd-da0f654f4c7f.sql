
-- Criar tabela de contratos digitais
CREATE TABLE public.contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  frete_id UUID NOT NULL REFERENCES public.fretes(id) ON DELETE CASCADE,
  produtor_id UUID NOT NULL REFERENCES public.produtores(id),
  transportador_id UUID NOT NULL REFERENCES public.transportadores(id),
  
  -- Dados do contrato
  texto_contrato TEXT NOT NULL,
  versao_contrato VARCHAR(20) NOT NULL DEFAULT '1.0',
  
  -- Status do contrato
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito')),
  
  -- Dados do aceite (preenchidos quando aceito)
  aceito_por_user_id UUID,
  aceito_em TIMESTAMP WITH TIME ZONE,
  ip_aceite VARCHAR(45),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Um contrato por frete
  UNIQUE(frete_id)
);

-- Enable RLS
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all contratos"
ON public.contratos FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Produtores can view their contratos"
ON public.contratos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM produtores p 
  WHERE p.id = contratos.produtor_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Transportadores can view their contratos"
ON public.contratos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM transportadores t 
  WHERE t.id = contratos.transportador_id 
  AND t.user_id = auth.uid()
));

CREATE POLICY "System can insert contratos"
ON public.contratos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Transportadores can update their contratos"
ON public.contratos FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM transportadores t 
  WHERE t.id = contratos.transportador_id 
  AND t.user_id = auth.uid()
));

CREATE POLICY "Admins can update contratos"
ON public.contratos FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_contratos_updated_at
BEFORE UPDATE ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna contrato_aceito na tabela fretes
ALTER TABLE public.fretes ADD COLUMN IF NOT EXISTS contrato_aceito BOOLEAN DEFAULT false;
