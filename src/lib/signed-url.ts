import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a signed URL for private storage files.
 * URL expires in 10 minutes (600 seconds).
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error.message);
    return null;
  }

  return data.signedUrl;
}

/**
 * Upload file and return the storage path (NOT a public URL).
 * The path should be used with getSignedUrl() when displaying.
 */
export function getStoragePath(
  userId: string,
  tipo: string,
  fileName: string
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${userId}/${tipo}_${Date.now()}_${safeName}`;
}
