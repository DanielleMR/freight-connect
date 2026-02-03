import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type VehicleType = 'truck' | 'carreta' | 'bitruck' | 'romeu_julieta';

interface Vehicle {
  id: string;
  public_id: string;
  plate: string;
  vehicle_type: VehicleType;
  capacity: number;
  owner_user_id: string | null;
  owner_company_id: string | null;
  active: boolean;
}

interface UseVehiclesReturn {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  createVehicle: (data: {
    plate: string;
    vehicle_type: VehicleType;
    capacity: number;
    owner_company_id?: string;
  }) => Promise<boolean>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<boolean>;
  deleteVehicle: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useVehicles(): UseVehiclesReturn {
  const { user, loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = async () => {
    if (!user) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('vehicles')
        .select('*')
        .or(`owner_user_id.eq.${user.id}`);

      if (fetchError) throw fetchError;
      setVehicles(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      setError(err.message);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const createVehicle = async (data: {
    plate: string;
    vehicle_type: VehicleType;
    capacity: number;
    owner_company_id?: string;
  }): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: insertError } = await supabase
        .from('vehicles')
        .insert({
          plate: data.plate.toUpperCase(),
          vehicle_type: data.vehicle_type,
          capacity: data.capacity,
          owner_user_id: data.owner_company_id ? null : user.id,
          owner_company_id: data.owner_company_id || null,
        });

      if (insertError) throw insertError;
      await fetchVehicles();
      return true;
    } catch (err: any) {
      console.error('Error creating vehicle:', err);
      setError(err.message);
      return false;
    }
  };

  const updateVehicle = async (id: string, data: Partial<Vehicle>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update(data)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchVehicles();
      return true;
    } catch (err: any) {
      console.error('Error updating vehicle:', err);
      setError(err.message);
      return false;
    }
  };

  const deleteVehicle = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchVehicles();
      return true;
    } catch (err: any) {
      console.error('Error deleting vehicle:', err);
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchVehicles();
    }
  }, [user, authLoading]);

  return {
    vehicles,
    loading: authLoading || loading,
    error,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    refetch: fetchVehicles,
  };
}
