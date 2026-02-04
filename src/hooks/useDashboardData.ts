import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { UserCapability, useUserCapabilities } from './useUserCapabilities';
import { Database } from '@/integrations/supabase/types';

type FreteStatus = Database['public']['Enums']['frete_status'];

interface FreteStats {
  total: number;
  pending: number;
  active: number;
  completed: number;
  cancelled: number;
}

interface SparklinePoint {
  value: number;
}

interface RecentFrete {
  id: string;
  publicId: string;
  origin: string | null;
  destination: string | null;
  status: FreteStatus;
  createdAt: string;
  animalType?: string | null;
  quantity?: number | null;
}

interface DashboardData {
  userName: string;
  stats: FreteStats;
  recentFretes: RecentFrete[];
  sparklineData: {
    pending: SparklinePoint[];
    active: SparklinePoint[];
    completed: SparklinePoint[];
  };
}

interface UseDashboardDataReturn {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  activeCapability: UserCapability;
  setActiveCapability: (cap: UserCapability) => void;
  refetch: () => Promise<void>;
}

export function useDashboardData(): UseDashboardDataReturn {
  const { user } = useAuth();
  const { capabilities, loading: capLoading } = useUserCapabilities();
  const [activeCapability, setActiveCapability] = useState<UserCapability>('producer');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize active capability from user's actual capabilities
  useEffect(() => {
    if (!capLoading && capabilities.length > 0) {
      // Default to first available capability
      if (!capabilities.includes(activeCapability)) {
        setActiveCapability(capabilities[0]);
      }
    }
  }, [capabilities, capLoading, activeCapability]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let profileData: { name: string; id: string } | null = null;

      // Fetch profile based on active capability
      if (activeCapability === 'producer') {
        // Try new producer_profiles first, then legacy produtores
        const { data: newProfile } = await supabase
          .from('producer_profiles')
          .select('name, id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (newProfile) {
          profileData = { name: newProfile.name, id: newProfile.id };
        } else {
          const { data: legacyProfile } = await supabase
            .from('produtores')
            .select('nome, id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (legacyProfile) {
            profileData = { name: legacyProfile.nome, id: legacyProfile.id };
          }
        }
      } else if (activeCapability === 'driver') {
        // Try new driver_profiles first, then legacy transportadores
        const { data: newProfile } = await supabase
          .from('driver_profiles')
          .select('name, id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (newProfile) {
          profileData = { name: newProfile.name, id: newProfile.id };
        } else {
          const { data: legacyProfile } = await supabase
            .from('transportadores')
            .select('nome, id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (legacyProfile) {
            profileData = { name: legacyProfile.nome, id: legacyProfile.id };
          }
        }
      } else if (activeCapability === 'company_admin') {
        const { data: company } = await supabase
          .from('companies')
          .select('name, id')
          .eq('admin_user_id', user.id)
          .maybeSingle();

        if (company) {
          profileData = { name: company.name, id: company.id };
        }
      }

      if (!profileData) {
        // Use email as fallback
        setData({
          userName: user.email?.split('@')[0] || 'Usuário',
          stats: { total: 0, pending: 0, active: 0, completed: 0, cancelled: 0 },
          recentFretes: [],
          sparklineData: { pending: [], active: [], completed: [] },
        });
        return;
      }

      // Fetch fretes based on capability
      let fretesQuery;
      if (activeCapability === 'producer') {
        fretesQuery = supabase
          .from('fretes')
          .select('id, public_id, origem, destino, status, created_at, tipo_animal, quantidade_animais')
          .eq('produtor_id', profileData.id)
          .order('created_at', { ascending: false });
      } else {
        fretesQuery = supabase
          .from('fretes')
          .select('id, public_id, origem, destino, status, created_at, tipo_animal, quantidade_animais')
          .eq('transportador_id', profileData.id)
          .order('created_at', { ascending: false });
      }

      const { data: fretes } = await fretesQuery;
      const freightList = fretes || [];

      // Calculate stats
      const stats: FreteStats = {
        total: freightList.length,
        pending: freightList.filter(f => f.status === 'solicitado').length,
        active: freightList.filter(f => ['aceito', 'em_andamento'].includes(f.status)).length,
        completed: freightList.filter(f => f.status === 'concluido').length,
        cancelled: freightList.filter(f => f.status === 'recusado').length,
      };

      // Generate sparkline data (last 7 data points simulation)
      const generateSparkline = (count: number): SparklinePoint[] => {
        if (count === 0) return [];
        const base = Math.max(1, count - 3);
        return Array.from({ length: 7 }, (_, i) => ({
          value: base + Math.floor(Math.random() * 4) + (i > 4 ? 1 : 0),
        }));
      };

      // Map recent fretes
      const recentFretes: RecentFrete[] = freightList.slice(0, 5).map(f => ({
        id: f.id,
        publicId: f.public_id,
        origin: f.origem,
        destination: f.destino,
        status: f.status,
        createdAt: f.created_at || new Date().toISOString(),
        animalType: f.tipo_animal,
        quantity: f.quantidade_animais,
      }));

      setData({
        userName: profileData.name,
        stats,
        recentFretes,
        sparklineData: {
          pending: generateSparkline(stats.pending),
          active: generateSparkline(stats.active),
          completed: generateSparkline(stats.completed),
        },
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Erro ao carregar dados do painel');
    } finally {
      setLoading(false);
    }
  }, [user, activeCapability]);

  useEffect(() => {
    if (user && !capLoading) {
      fetchDashboardData();
    }
  }, [user, capLoading, fetchDashboardData]);

  return {
    data,
    loading: loading || capLoading,
    error,
    activeCapability,
    setActiveCapability,
    refetch: fetchDashboardData,
  };
}
