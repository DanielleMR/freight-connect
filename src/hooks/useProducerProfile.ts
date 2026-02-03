import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ProducerProfile {
  id: string;
  public_id: string;
  name: string;
  cpf_cnpj: string | null;
  phone: string;
  city: string | null;
  state: string | null;
  terms_accepted: boolean;
}

interface UseProducerProfileReturn {
  profile: ProducerProfile | null;
  loading: boolean;
  error: string | null;
  createProfile: (data: Omit<ProducerProfile, 'id' | 'public_id' | 'terms_accepted'> & { terms_accepted: boolean }) => Promise<boolean>;
  updateProfile: (data: Partial<ProducerProfile>) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useProducerProfile(): UseProducerProfileReturn {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('producer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setProfile(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching producer profile:', err);
      setError(err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (data: Omit<ProducerProfile, 'id' | 'public_id' | 'terms_accepted'> & { terms_accepted: boolean }): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: insertError } = await supabase
        .from('producer_profiles')
        .insert({
          user_id: user.id,
          name: data.name,
          cpf_cnpj: data.cpf_cnpj,
          phone: data.phone,
          city: data.city,
          state: data.state,
          terms_accepted: data.terms_accepted,
          terms_accepted_at: data.terms_accepted ? new Date().toISOString() : null,
        });

      if (insertError) throw insertError;

      // Add producer capability
      await supabase
        .from('user_capabilities')
        .insert({
          user_id: user.id,
          capability: 'producer'
        });

      await fetchProfile();
      return true;
    } catch (err: any) {
      console.error('Error creating producer profile:', err);
      setError(err.message);
      return false;
    }
  };

  const updateProfile = async (data: Partial<ProducerProfile>): Promise<boolean> => {
    if (!user || !profile) return false;

    try {
      const { error: updateError } = await supabase
        .from('producer_profiles')
        .update(data)
        .eq('id', profile.id);

      if (updateError) throw updateError;
      await fetchProfile();
      return true;
    } catch (err: any) {
      console.error('Error updating producer profile:', err);
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading]);

  return {
    profile,
    loading: authLoading || loading,
    error,
    createProfile,
    updateProfile,
    refetch: fetchProfile,
  };
}
