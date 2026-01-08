
-- Corrigir política de INSERT para contratos - apenas admin ou sistema podem criar
DROP POLICY IF EXISTS "System can insert contratos" ON public.contratos;

CREATE POLICY "Authenticated users can insert contratos for their fretes"
ON public.contratos FOR INSERT
WITH CHECK (
  -- Admin pode inserir
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Produtor pode inserir para seu próprio frete
  EXISTS (
    SELECT 1 FROM produtores p 
    WHERE p.id = contratos.produtor_id 
    AND p.user_id = auth.uid()
  )
  OR
  -- Transportador pode inserir para frete atribuído a ele
  EXISTS (
    SELECT 1 FROM transportadores t 
    WHERE t.id = contratos.transportador_id 
    AND t.user_id = auth.uid()
  )
);
