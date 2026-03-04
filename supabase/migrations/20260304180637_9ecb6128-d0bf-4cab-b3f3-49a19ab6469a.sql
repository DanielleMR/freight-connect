
-- Document verification logs (OCR results)
CREATE TABLE public.document_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ocr_service TEXT NOT NULL DEFAULT 'google_vision',
  ocr_result JSONB,
  extracted_data JSONB,
  comparison_result JSONB,
  status TEXT NOT NULL DEFAULT 'pendente',
  document_hash TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage verifications" ON public.document_verifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own verifications" ON public.document_verifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Email logs
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resend_id TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email_logs" ON public.email_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own email_logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Security logs
CREATE TABLE public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security_logs" ON public.security_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own security_logs" ON public.security_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
