
-- ============================================
-- SECURITY FIX 1: Remove dangerous self-insert policy on user_roles
-- This prevents any user from granting themselves admin role
-- ============================================
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- ============================================
-- SECURITY FIX 2: Remove dangerous self-insert policy on user_capabilities  
-- This prevents any user from granting themselves any capability
-- ============================================
DROP POLICY IF EXISTS "Users can add their own capabilities" ON public.user_capabilities;

-- ============================================
-- SECURITY FIX 3: Create secure function for role assignment (replaces direct insert)
-- Only allows non-admin roles for self-assignment, admin role requires existing admin
-- ============================================
CREATE OR REPLACE FUNCTION public.assign_role_securely(p_user_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block admin role self-assignment
  IF p_role = 'admin' THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Cannot assign admin role without admin privileges';
    END IF;
  END IF;
  
  -- Only allow self-assignment for non-admin roles
  IF auth.uid() != p_user_id AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Cannot assign roles to other users';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT DO NOTHING;
  
  RETURN true;
END;
$$;

-- ============================================
-- SECURITY FIX 4: Create secure function for capability assignment
-- ============================================
CREATE OR REPLACE FUNCTION public.assign_capability_securely(p_user_id uuid, p_capability user_capability)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow self-assignment or admin assignment
  IF auth.uid() != p_user_id AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Cannot assign capabilities to other users';
  END IF;
  
  INSERT INTO public.user_capabilities (user_id, capability)
  VALUES (p_user_id, p_capability)
  ON CONFLICT DO NOTHING;
  
  RETURN true;
END;
$$;

-- ============================================
-- SECURITY FIX 5: Add RLS to views that expose sensitive data
-- Enable RLS on views
-- ============================================

-- For transportador_contato_seguro - restrict to involved parties
ALTER VIEW public.transportador_contato_seguro SET (security_invoker = on);

-- For produtor_contato_seguro - restrict to involved parties  
ALTER VIEW public.produtor_contato_seguro SET (security_invoker = on);

-- For pagamento_resumo - restrict access
ALTER VIEW public.pagamento_resumo SET (security_invoker = on);

-- For transportador_listagem - restrict to authenticated
ALTER VIEW public.transportador_listagem SET (security_invoker = on);
