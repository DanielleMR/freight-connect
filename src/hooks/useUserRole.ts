import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'produtor' | 'transportador';

interface UseUserRoleReturn {
  roles: AppRole[];
  loading: boolean;
  isProdutor: boolean;
  isTransportador: boolean;
  isAdmin: boolean;
  hasRole: (role: AppRole) => boolean;
  refetch: () => Promise<void>;
}

export function useUserRole(): UseUserRoleReturn {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const userRoles = (data || []).map(r => r.role as AppRole);
      setRoles(userRoles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchRoles();
    }
  }, [user, authLoading]);

  return {
    roles,
    loading: authLoading || loading,
    isProdutor: roles.includes('produtor'),
    isTransportador: roles.includes('transportador'),
    isAdmin: roles.includes('admin'),
    hasRole: (role: AppRole) => roles.includes(role),
    refetch: fetchRoles,
  };
}

export async function getUserRolesByUserId(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }

  return (data || []).map(r => r.role as AppRole);
}
