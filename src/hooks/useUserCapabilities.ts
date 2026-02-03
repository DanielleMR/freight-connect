import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserCapability = 'producer' | 'driver' | 'company_admin';

interface UseUserCapabilitiesReturn {
  capabilities: UserCapability[];
  loading: boolean;
  isProducer: boolean;
  isDriver: boolean;
  isCompanyAdmin: boolean;
  hasCapability: (cap: UserCapability) => boolean;
  addCapability: (cap: UserCapability) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useUserCapabilities(): UseUserCapabilitiesReturn {
  const { user, loading: authLoading } = useAuth();
  const [capabilities, setCapabilities] = useState<UserCapability[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCapabilities = async () => {
    if (!user) {
      setCapabilities([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_capabilities')
        .select('capability')
        .eq('user_id', user.id)
        .eq('active', true);

      if (error) throw error;

      const caps = (data || []).map(c => c.capability as UserCapability);
      setCapabilities(caps);
    } catch (error) {
      console.error('Error fetching user capabilities:', error);
      setCapabilities([]);
    } finally {
      setLoading(false);
    }
  };

  const addCapability = async (cap: UserCapability): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_capabilities')
        .insert({
          user_id: user.id,
          capability: cap
        });

      if (error) throw error;
      
      await fetchCapabilities();
      return true;
    } catch (error) {
      console.error('Error adding capability:', error);
      return false;
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchCapabilities();
    }
  }, [user, authLoading]);

  return {
    capabilities,
    loading: authLoading || loading,
    isProducer: capabilities.includes('producer'),
    isDriver: capabilities.includes('driver'),
    isCompanyAdmin: capabilities.includes('company_admin'),
    hasCapability: (cap: UserCapability) => capabilities.includes(cap),
    addCapability,
    refetch: fetchCapabilities,
  };
}
