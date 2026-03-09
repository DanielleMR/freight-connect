
-- Create report_reason enum
CREATE TYPE public.report_reason AS ENUM ('fraude', 'comportamento_inadequado', 'dados_falsos', 'golpe', 'outro');

-- Create report_status enum
CREATE TYPE public.report_status AS ENUM ('pendente', 'em_analise', 'resolvido');

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  reason report_reason NOT NULL,
  description TEXT NOT NULL,
  evidence_url TEXT,
  evidence_name TEXT,
  status report_status NOT NULL DEFAULT 'pendente',
  admin_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports (but not report themselves)
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND reported_user_id != auth.uid()
  );

-- Users can view their own submitted reports
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Admins can do everything
CREATE POLICY "Admins can manage all reports"
  ON public.reports FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to notify admins when a new report is created
CREATE OR REPLACE FUNCTION public.notify_admin_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
BEGIN
  -- Notify all admins
  FOR v_admin IN
    SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    PERFORM criar_notificacao(
      v_admin.user_id,
      'nova_denuncia',
      'Nova Denúncia Recebida ⚠️',
      'Uma nova denúncia foi registrada e requer análise.',
      NEW.id,
      'report'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- Trigger for admin notification on new report
CREATE TRIGGER trigger_notify_admin_new_report
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_report();
