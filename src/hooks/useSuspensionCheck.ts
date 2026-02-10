import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SuspensionInfo {
  isSuspended: boolean;
  motivo: string | null;
  suspendedAt: string | null;
  loading: boolean;
}

export function useSuspensionCheck(): SuspensionInfo {
  const { user, loading: authLoading } = useAuth();
  const [isSuspended, setIsSuspended] = useState(false);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [suspendedAt, setSuspendedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsSuspended(false);
      setMotivo(null);
      setSuspendedAt(null);
      setLoading(false);
      return;
    }

    const checkSuspension = async () => {
      try {
        const { data, error } = await supabase
          .from('suspensoes')
          .select('motivo, created_at')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setIsSuspended(true);
          setMotivo(data.motivo);
          setSuspendedAt(data.created_at);
        } else {
          setIsSuspended(false);
          setMotivo(null);
          setSuspendedAt(null);
        }
      } catch (err) {
        console.error('Error checking suspension:', err);
        setIsSuspended(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuspension();
  }, [user, authLoading]);

  return { isSuspended, motivo, suspendedAt, loading: authLoading || loading };
}
