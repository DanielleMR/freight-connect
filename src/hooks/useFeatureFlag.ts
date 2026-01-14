import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureFlags {
  [key: string]: boolean;
}

// Cache para evitar múltiplas requisições
let flagsCache: FeatureFlags | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minuto

export function useFeatureFlag(flagKey: string): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlag = async () => {
      // Usar cache se ainda válido
      if (flagsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
        setEnabled(flagsCache[flagKey] ?? false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('chave, ativo');

        if (error) throw error;

        // Atualizar cache
        flagsCache = {};
        (data || []).forEach(flag => {
          flagsCache![flag.chave] = flag.ativo;
        });
        cacheTimestamp = Date.now();

        setEnabled(flagsCache[flagKey] ?? false);
      } catch (error) {
        console.error('Erro ao buscar feature flags:', error);
        setEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    fetchFlag();
  }, [flagKey]);

  return { enabled, loading };
}

export function useAllFeatureFlags(): { flags: FeatureFlags; loading: boolean; refetch: () => Promise<void> } {
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [loading, setLoading] = useState(true);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('chave, ativo');

      if (error) throw error;

      const flagsMap: FeatureFlags = {};
      (data || []).forEach(flag => {
        flagsMap[flag.chave] = flag.ativo;
      });

      setFlags(flagsMap);
      flagsCache = flagsMap;
      cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Erro ao buscar feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  return { flags, loading, refetch: fetchFlags };
}

// Função para invalidar cache (usar após atualização)
export function invalidateFeatureFlagsCache() {
  flagsCache = null;
  cacheTimestamp = 0;
}
