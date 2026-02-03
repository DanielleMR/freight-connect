import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type CNHStatus = 'pending' | 'validated' | 'rejected';

interface DriverProfile {
  id: string;
  public_id: string;
  name: string;
  cpf: string;
  phone: string;
  cnh_number: string | null;
  cnh_category: string | null;
  cnh_expiry: string | null;
  cnh_status: CNHStatus;
  terms_accepted: boolean;
  active: boolean;
}

interface UseDriverProfileReturn {
  profile: DriverProfile | null;
  loading: boolean;
  error: string | null;
  canAcceptFreights: boolean;
  createProfile: (data: {
    name: string;
    cpf: string;
    phone: string;
    cnh_number?: string;
    cnh_category?: string;
    cnh_expiry?: string;
    terms_accepted: boolean;
  }) => Promise<boolean>;
  updateProfile: (data: Partial<DriverProfile>) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useDriverProfile(): UseDriverProfileReturn {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
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
        .from('driver_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setProfile(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching driver profile:', err);
      setError(err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (data: {
    name: string;
    cpf: string;
    phone: string;
    cnh_number?: string;
    cnh_category?: string;
    cnh_expiry?: string;
    terms_accepted: boolean;
  }): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: insertError } = await supabase
        .from('driver_profiles')
        .insert({
          user_id: user.id,
          name: data.name,
          cpf: data.cpf,
          phone: data.phone,
          cnh_number: data.cnh_number || null,
          cnh_category: data.cnh_category || null,
          cnh_expiry: data.cnh_expiry || null,
          terms_accepted: data.terms_accepted,
          terms_accepted_at: data.terms_accepted ? new Date().toISOString() : null,
        });

      if (insertError) throw insertError;

      // Add driver capability
      await supabase
        .from('user_capabilities')
        .insert({
          user_id: user.id,
          capability: 'driver'
        });

      await fetchProfile();
      return true;
    } catch (err: any) {
      console.error('Error creating driver profile:', err);
      setError(err.message);
      return false;
    }
  };

  const updateProfile = async (data: Partial<DriverProfile>): Promise<boolean> => {
    if (!user || !profile) return false;

    try {
      const { error: updateError } = await supabase
        .from('driver_profiles')
        .update(data)
        .eq('id', profile.id);

      if (updateError) throw updateError;
      await fetchProfile();
      return true;
    } catch (err: any) {
      console.error('Error updating driver profile:', err);
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading]);

  const canAcceptFreights = profile?.cnh_status === 'validated' && profile?.active === true;

  return {
    profile,
    loading: authLoading || loading,
    error,
    canAcceptFreights,
    createProfile,
    updateProfile,
    refetch: fetchProfile,
  };
}
