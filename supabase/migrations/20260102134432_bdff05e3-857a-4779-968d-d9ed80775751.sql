-- Remove política permissiva que expõe dados sensíveis
DROP POLICY IF EXISTS "Authenticated users can view transportadores" ON public.transportadores;

-- Transportadores podem ver seus próprios dados
CREATE POLICY "Transportadores can view own profile"
ON public.transportadores FOR SELECT
USING (user_id = auth.uid());

-- Produtores podem ver transportadores para o diretório (dados básicos)
CREATE POLICY "Produtores can view transportador directory"
ON public.transportadores FOR SELECT
USING (has_role(auth.uid(), 'produtor'::app_role));

-- Admins podem ver todos os transportadores
CREATE POLICY "Admins can view all transportadores"
ON public.transportadores FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar view segura para o diretório público (sem dados sensíveis)
CREATE OR REPLACE VIEW public.transportadores_directory AS
SELECT 
  id,
  nome,
  tipo_animal,
  regiao_atendimento,
  capacidade_animais,
  tipo_caminhao,
  ativo,
  latitude,
  longitude
FROM public.transportadores
WHERE ativo = true;

-- Permitir que usuários autenticados vejam o diretório
GRANT SELECT ON public.transportadores_directory TO authenticated;