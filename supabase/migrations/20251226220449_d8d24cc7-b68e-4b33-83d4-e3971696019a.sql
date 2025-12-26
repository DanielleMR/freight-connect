-- Fix fretes INSERT policy: produtor_id should reference produtores.id, not auth.uid() directly
DROP POLICY IF EXISTS "Produtores can create fretes" ON public.fretes;

CREATE POLICY "Produtores can create fretes" 
ON public.fretes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM produtores 
    WHERE id = fretes.produtor_id 
    AND user_id = auth.uid()
  ) 
  AND has_role(auth.uid(), 'produtor'::app_role)
);

-- Protect producer sensitive data: remove direct access from transportadores
-- Update produtores SELECT policies to be more restrictive
DROP POLICY IF EXISTS "Admins can view all produtores" ON public.produtores;
DROP POLICY IF EXISTS "Produtores can view their own data" ON public.produtores;

-- Only produtores can see their own data (full access)
CREATE POLICY "Produtores can view their own data" 
ON public.produtores 
FOR SELECT 
USING (user_id = auth.uid());

-- Admins can view all produtores
CREATE POLICY "Admins can view all produtores" 
ON public.produtores 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a limited view function for transportadores to see only producer name (not PII)
CREATE OR REPLACE FUNCTION public.get_produtor_name(produtor_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nome FROM produtores WHERE id = produtor_uuid
$$;