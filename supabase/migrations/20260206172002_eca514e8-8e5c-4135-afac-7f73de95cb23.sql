
-- Table for disputes linked to freights
CREATE TABLE public.disputas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  frete_id UUID NOT NULL REFERENCES public.fretes(id),
  aberto_por UUID NOT NULL,
  motivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_analise', 'resolvida', 'cancelada')),
  resolucao TEXT,
  resolvido_por UUID,
  resolvido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disputas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all disputas" ON public.disputas FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view disputas on their fretes" ON public.disputas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fretes f
      JOIN produtores p ON p.id = f.produtor_id
      WHERE f.id = disputas.frete_id AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM fretes f
      JOIN transportadores t ON t.id = f.transportador_id
      WHERE f.id = disputas.frete_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create disputas on their fretes" ON public.disputas FOR INSERT
  WITH CHECK (
    aberto_por = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM fretes f
        JOIN produtores p ON p.id = f.produtor_id
        WHERE f.id = disputas.frete_id AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM fretes f
        JOIN transportadores t ON t.id = f.transportador_id
        WHERE f.id = disputas.frete_id AND t.user_id = auth.uid()
      )
    )
  );

-- Table for user suspensions
CREATE TABLE public.suspensoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  motivo TEXT NOT NULL,
  suspenso_por UUID NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  removido_por UUID,
  removido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suspensoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage suspensoes" ON public.suspensoes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own suspensoes" ON public.suspensoes FOR SELECT
  USING (user_id = auth.uid());

-- Table for terms acceptance log (immutable audit trail)
CREATE TABLE public.aceites_termos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo_termo TEXT NOT NULL CHECK (tipo_termo IN ('termos_uso', 'politica_privacidade')),
  versao TEXT NOT NULL DEFAULT '1.0',
  ip_aceite TEXT,
  aceito_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aceites_termos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own aceites" ON public.aceites_termos FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own aceites" ON public.aceites_termos FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all aceites" ON public.aceites_termos FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
