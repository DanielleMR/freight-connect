
-- CORREÇÃO: Renomear VIEW para evitar conflito com ENUM pagamento_status
-- =================================================================

-- VIEW DE PAGAMENTOS (STATUS APENAS) - nome corrigido
CREATE OR REPLACE VIEW public.pagamento_resumo
WITH (security_invoker = on) AS
SELECT 
  p.id,
  p.frete_id,
  p.transportador_id,
  p.tipo,
  p.status,
  p.created_at,
  p.pago_em
  -- valor_total, valor_comissao, percentual NÃO EXPOSTOS
FROM pagamentos p;

COMMENT ON VIEW public.pagamento_resumo IS 'VIEW de pagamentos expondo apenas status, sem valores financeiros';
