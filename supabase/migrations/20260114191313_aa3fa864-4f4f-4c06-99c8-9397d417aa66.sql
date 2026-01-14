-- Create feature_flags table
CREATE TABLE public.feature_flags (
  chave TEXT PRIMARY KEY,
  ativo BOOLEAN NOT NULL DEFAULT false,
  descricao TEXT
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Admins can manage feature flags
CREATE POLICY "Admins can manage feature_flags"
ON public.feature_flags
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can read feature flags
CREATE POLICY "Authenticated users can read feature_flags"
ON public.feature_flags
FOR SELECT
USING (auth.uid() IS NOT NULL);