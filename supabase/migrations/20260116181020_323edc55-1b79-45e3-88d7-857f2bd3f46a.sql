
-- ========================================
-- VIEW SEGURA: Transportador (para listagem pública)
-- ========================================
-- Transportadores visíveis para produtores, MAS sem dados de contato direto
CREATE OR REPLACE VIEW public.transportador_listagem
WITH (security_invoker = on) AS
SELECT 
  t.id,
  t.public_id,
  t.nome,
  t.regiao_atendimento,
  t.tipo_animal,
  t.tipo_caminhao,
  t.capacidade_animais,
  t.latitude,
  t.longitude,
  t.ativo,
  t.plano_tipo,
  t.destaque_mapa,
  t.created_at
  -- Sem: telefone, whatsapp, cpf_cnpj, user_id
FROM public.transportadores t;

-- ========================================
-- VIEW SEGURA: Contato do Transportador (liberado apenas após pagamento)
-- ========================================
CREATE OR REPLACE VIEW public.transportador_contato_seguro
WITH (security_invoker = on) AS
SELECT 
  t.id,
  t.public_id,
  t.nome,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.fretes f
      JOIN public.produtores p ON p.id = f.produtor_id
      WHERE f.transportador_id = t.id 
        AND f.pagamento_confirmado = true
        AND p.user_id = auth.uid()
    ) 
    OR t.user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    THEN t.telefone
    ELSE NULL
  END AS telefone,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.fretes f
      JOIN public.produtores p ON p.id = f.produtor_id
      WHERE f.transportador_id = t.id 
        AND f.pagamento_confirmado = true
        AND p.user_id = auth.uid()
    ) 
    OR t.user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    THEN t.whatsapp
    ELSE NULL
  END AS whatsapp
FROM public.transportadores t;

-- ========================================
-- VIEW SEGURA: Contato do Produtor (para transportadores após aceitar frete)
-- ========================================
CREATE OR REPLACE VIEW public.produtor_contato_seguro
WITH (security_invoker = on) AS
SELECT 
  p.id,
  p.public_id,
  p.nome,
  p.cidade,
  p.estado,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.fretes f
      JOIN public.transportadores t ON t.id = f.transportador_id
      WHERE f.produtor_id = p.id 
        AND f.pagamento_confirmado = true
        AND t.user_id = auth.uid()
    ) 
    OR p.user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    THEN p.telefone
    ELSE NULL
  END AS telefone
FROM public.produtores p;

-- ========================================
-- Fortalecer RLS: Transportadores só veem dados de produtores em fretes aceitos
-- ========================================
DROP POLICY IF EXISTS "Transportadores can view producer info for their fretes" ON public.produtores;

CREATE POLICY "Transportadores can view producer info for their fretes"
ON public.produtores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.fretes f
    JOIN public.transportadores t ON t.id = f.transportador_id
    WHERE f.produtor_id = produtores.id
      AND t.user_id = auth.uid()
      AND f.status IN ('aceito', 'em_andamento', 'concluido')
  )
);

-- ========================================
-- Garantir que avaliações exigem autenticação e frete finalizado
-- ========================================
DROP POLICY IF EXISTS "Users can insert avaliacoes" ON public.avaliacoes;
DROP POLICY IF EXISTS "Authenticated users can insert avaliacoes" ON public.avaliacoes;
DROP POLICY IF EXISTS "Produtores can create avaliacoes" ON public.avaliacoes;
DROP POLICY IF EXISTS "Produtores can create avaliacoes for their fretes" ON public.avaliacoes;

CREATE POLICY "Produtores can create avaliacoes for completed fretes"
ON public.avaliacoes
FOR INSERT
TO authenticated
WITH CHECK (
  -- Deve ser o produtor do frete
  EXISTS (
    SELECT 1 FROM public.fretes f
    JOIN public.produtores p ON p.id = f.produtor_id
    WHERE f.id = avaliacoes.frete_id
      AND p.user_id = auth.uid()
      AND f.status = 'concluido'
  )
  -- Evitar duplicatas
  AND NOT EXISTS (
    SELECT 1 FROM public.avaliacoes a
    WHERE a.frete_id = avaliacoes.frete_id
  )
);

-- Comentários para documentação
COMMENT ON VIEW public.transportador_listagem IS 'View segura para listagem pública de transportadores, sem dados de contato';
COMMENT ON VIEW public.transportador_contato_seguro IS 'View segura que libera contato apenas após pagamento confirmado';
COMMENT ON VIEW public.produtor_contato_seguro IS 'View segura que libera contato do produtor apenas após pagamento confirmado';
