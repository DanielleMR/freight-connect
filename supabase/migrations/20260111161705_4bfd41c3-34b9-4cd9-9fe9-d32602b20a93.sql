-- =============================================
-- MÓDULO 3: CHAT INTERNO (vinculado ao frete)
-- =============================================

-- Criar tabela de mensagens do chat
CREATE TABLE public.mensagens_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  frete_id UUID NOT NULL REFERENCES public.fretes(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  sender_tipo TEXT NOT NULL CHECK (sender_tipo IN ('produtor', 'transportador', 'admin')),
  conteudo TEXT NOT NULL,
  bloqueada BOOLEAN NOT NULL DEFAULT false,
  motivo_bloqueio TEXT,
  arquivo_url TEXT,
  arquivo_tipo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mensagens_chat ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages from their own fretes
CREATE POLICY "Users can view their frete messages"
ON public.mensagens_chat
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM fretes f
    JOIN produtores p ON f.produtor_id = p.id
    WHERE f.id = frete_id AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM fretes f
    JOIN transportadores t ON f.transportador_id = t.id
    WHERE f.id = frete_id AND t.user_id = auth.uid()
  )
  OR
  public.has_role(auth.uid(), 'admin')
);

-- Policy: Users can insert messages to their own fretes
CREATE POLICY "Users can send messages to their fretes"
ON public.mensagens_chat
FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM fretes f
      JOIN produtores p ON f.produtor_id = p.id
      WHERE f.id = frete_id AND p.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM fretes f
      JOIN transportadores t ON f.transportador_id = t.id
      WHERE f.id = frete_id AND t.user_id = auth.uid()
    )
    OR
    public.has_role(auth.uid(), 'admin')
  )
);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_chat;

-- =============================================
-- MÓDULO 4: VERIFICAÇÃO DE DOCUMENTOS
-- =============================================

-- Criar enum para status de documento
CREATE TYPE public.documento_status AS ENUM ('pendente', 'aprovado', 'reprovado');

-- Criar enum para tipo de documento
CREATE TYPE public.documento_tipo AS ENUM (
  'cpf_cnpj',
  'documento_pessoal',
  'cnh',
  'crlv',
  'documento_veiculo'
);

-- Criar tabela de documentos
CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_tipo TEXT NOT NULL CHECK (user_tipo IN ('produtor', 'transportador')),
  tipo_documento documento_tipo NOT NULL,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  status documento_status NOT NULL DEFAULT 'pendente',
  motivo_reprovacao TEXT,
  aprovado_por UUID,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tipo_documento)
);

-- Enable RLS
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own documents
CREATE POLICY "Users can view their own documents"
ON public.documentos
FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Policy: Users can insert their own documents
CREATE POLICY "Users can upload their own documents"
ON public.documentos
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own pending documents
CREATE POLICY "Users can update their pending documents"
ON public.documentos
FOR UPDATE
USING (
  (user_id = auth.uid() AND status = 'pendente')
  OR public.has_role(auth.uid(), 'admin')
);

-- Policy: Admin can delete documents
CREATE POLICY "Admin can delete documents"
ON public.documentos
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_documentos_updated_at
BEFORE UPDATE ON public.documentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function para verificar se usuário está aprovado para contratos
CREATE OR REPLACE FUNCTION public.usuario_aprovado_para_contrato(p_user_id UUID, p_user_tipo TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_docs_necessarios TEXT[];
  v_docs_aprovados INT;
BEGIN
  IF p_user_tipo = 'produtor' THEN
    v_docs_necessarios := ARRAY['cpf_cnpj', 'documento_pessoal'];
  ELSIF p_user_tipo = 'transportador' THEN
    v_docs_necessarios := ARRAY['cnh', 'crlv', 'documento_veiculo'];
  ELSE
    RETURN false;
  END IF;
  
  SELECT COUNT(*) INTO v_docs_aprovados
  FROM documentos
  WHERE user_id = p_user_id
    AND tipo_documento::text = ANY(v_docs_necessarios)
    AND status = 'aprovado';
  
  RETURN v_docs_aprovados = array_length(v_docs_necessarios, 1);
END;
$$;

-- Criar storage bucket para documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Criar storage bucket para anexos do chat
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-anexos',
  'chat-anexos',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies para documentos
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documentos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documentos' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Admin can delete documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'documentos' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies para chat anexos
CREATE POLICY "Users can upload chat attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'chat-anexos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view chat attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-anexos' AND auth.uid() IS NOT NULL);

-- Notificação quando documento é aprovado/reprovado
CREATE OR REPLACE FUNCTION public.notify_documento_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pendente' AND NEW.status IN ('aprovado', 'reprovado') THEN
    IF NEW.status = 'aprovado' THEN
      PERFORM criar_notificacao(
        NEW.user_id,
        'documento_aprovado',
        'Documento Aprovado! ✅',
        'Seu documento ' || NEW.tipo_documento::text || ' foi aprovado.',
        NEW.id,
        'documento'
      );
    ELSE
      PERFORM criar_notificacao(
        NEW.user_id,
        'documento_reprovado',
        'Documento Reprovado ❌',
        'Seu documento ' || NEW.tipo_documento::text || ' foi reprovado. Motivo: ' || COALESCE(NEW.motivo_reprovacao, 'Não especificado'),
        NEW.id,
        'documento'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_documento_status
AFTER UPDATE ON public.documentos
FOR EACH ROW
EXECUTE FUNCTION public.notify_documento_status();