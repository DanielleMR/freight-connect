
-- Update commission calculation to use tiered rates
CREATE OR REPLACE FUNCTION public.calcular_comissao_frete(p_valor_frete numeric, p_transportador_id uuid)
 RETURNS TABLE(valor_comissao numeric, percentual numeric, tipo text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_percentual NUMERIC;
BEGIN
  IF transportador_tem_plano_pro(p_transportador_id) THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 'assinatura'::TEXT;
  ELSE
    -- Tiered commission: up to 750 = 12%, 751-2000 = 10%, above 2000 = 8%
    IF p_valor_frete <= 750 THEN
      v_percentual := 12.00;
    ELSIF p_valor_frete <= 2000 THEN
      v_percentual := 10.00;
    ELSE
      v_percentual := 8.00;
    END IF;
    
    RETURN QUERY SELECT (p_valor_frete * v_percentual / 100)::NUMERIC, v_percentual, 'comissao'::TEXT;
  END IF;
END;
$function$;
