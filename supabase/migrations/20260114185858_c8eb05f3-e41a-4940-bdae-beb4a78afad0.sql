-- =============================================================
-- FIX 1: Chat Attachments Storage Policy (STORAGE_EXPOSURE)
-- =============================================================
-- Drop existing permissive policies on chat-anexos bucket
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;

-- Create secure upload policy: verify user is participant in the frete
CREATE POLICY "Users can upload to their frete chats"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-anexos'
  AND auth.uid() IS NOT NULL
  AND (
    -- Verify user is produtor of this frete
    EXISTS (
      SELECT 1 FROM fretes f
      JOIN produtores p ON f.produtor_id = p.id
      WHERE p.user_id = auth.uid()
      AND f.id::text = (storage.foldername(name))[1]
    )
    -- OR verify user is transportador of this frete
    OR EXISTS (
      SELECT 1 FROM fretes f
      JOIN transportadores t ON f.transportador_id = t.id
      WHERE t.user_id = auth.uid()
      AND f.id::text = (storage.foldername(name))[1]
    )
    -- OR user is admin
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Create secure view policy: verify user is participant in the frete
CREATE POLICY "Users can view their frete chat attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-anexos' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Verify user is produtor of this frete
    EXISTS (
      SELECT 1 FROM fretes f
      JOIN produtores p ON f.produtor_id = p.id
      WHERE p.user_id = auth.uid()
      AND f.id::text = (storage.foldername(name))[1]
    )
    -- OR verify user is transportador of this frete
    OR EXISTS (
      SELECT 1 FROM fretes f
      JOIN transportadores t ON f.transportador_id = t.id
      WHERE t.user_id = auth.uid()
      AND f.id::text = (storage.foldername(name))[1]
    )
    -- OR user is admin
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- =============================================================
-- FIX 2: Prevent Admin Role Self-Assignment (CLIENT_SIDE_AUTH)
-- =============================================================
-- Create trigger function to validate role assignments
CREATE OR REPLACE FUNCTION validate_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block admin role assignment unless done by an existing admin
  IF NEW.role = 'admin' THEN
    IF auth.uid() IS NULL OR NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Cannot assign admin role - requires admin privileges';
    END IF;
  END IF;
  
  -- Allow produtor and transportador roles for self-assignment
  RETURN NEW;
END;
$$;

-- Create trigger to run before any INSERT on user_roles
DROP TRIGGER IF EXISTS validate_role_before_insert ON user_roles;
CREATE TRIGGER validate_role_before_insert
BEFORE INSERT ON user_roles
FOR EACH ROW
EXECUTE FUNCTION validate_role_assignment();