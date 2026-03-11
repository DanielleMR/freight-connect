import { supabase } from '@/integrations/supabase/client';

/**
 * Check rate limit before performing an action.
 * Returns true if allowed, false if rate limited.
 */
export async function checkRateLimit(
  action: 'login' | 'signup' | 'document_upload' | 'report' | 'password_reset',
  identifier: string
): Promise<{ allowed: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('rate-limit', {
      body: { action, identifier },
    });

    if (error) {
      // Fail open
      console.warn('Rate limit check failed, allowing:', error.message);
      return { allowed: true };
    }

    if (!data?.allowed) {
      return {
        allowed: false,
        error: data?.error || 'Muitas tentativas. Tente novamente em alguns minutos.',
      };
    }

    return { allowed: true };
  } catch {
    // Fail open
    return { allowed: true };
  }
}
