-- Create table for legal templates
CREATE TABLE public.templates_juridicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text UNIQUE NOT NULL,
  conteudo text NOT NULL,
  ativo boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.templates_juridicos ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can manage templates"
ON public.templates_juridicos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read active templates
CREATE POLICY "Authenticated users can read active templates"
ON public.templates_juridicos
FOR SELECT
USING (auth.uid() IS NOT NULL AND ativo = true);

-- Create trigger for updated_at
CREATE TRIGGER update_templates_juridicos_updated_at
BEFORE UPDATE ON public.templates_juridicos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();