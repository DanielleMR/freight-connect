import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FretePrecoEstimadoProps {
  distanciaKm?: number;
  tipoAnimal?: string;
  quantidade?: number;
  urgente?: boolean;
}

interface PrecoEstimado {
  preco_minimo: number;
  preco_medio: number;
  preco_maximo: number;
}

export function FretePrecoEstimado({ distanciaKm, tipoAnimal, quantidade, urgente = false }: FretePrecoEstimadoProps) {
  const [preco, setPreco] = useState<PrecoEstimado | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tipoAnimal || !quantidade || quantidade <= 0) {
      setPreco(null);
      return;
    }

    const timer = setTimeout(() => {
      fetchEstimate();
    }, 500);

    return () => clearTimeout(timer);
  }, [distanciaKm, tipoAnimal, quantidade, urgente]);

  const fetchEstimate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('estimate_freight_price', {
        p_distancia_km: distanciaKm || null,
        p_tipo_animal: tipoAnimal || 'bovino',
        p_quantidade: quantidade || 1,
        p_urgente: urgente,
      });

      if (!error && data && data.length > 0) {
        setPreco(data[0] as PrecoEstimado);
      }
    } catch {
      // Silently fail - this is optional UX
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (!preco && !loading) return null;

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Faixa de preço sugerida</span>
        </div>

        {loading ? (
          <div className="flex gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-12 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : preco ? (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md bg-background p-2 border">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                  <TrendingDown className="h-3 w-3" />
                  Mínimo
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(preco.preco_minimo)}
                </span>
              </div>
              <div className="rounded-md bg-primary/10 p-2 border border-primary/20">
                <div className="flex items-center justify-center gap-1 text-xs text-primary mb-1">
                  <Minus className="h-3 w-3" />
                  Médio
                </div>
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(preco.preco_medio)}
                </span>
              </div>
              <div className="rounded-md bg-background p-2 border">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3" />
                  Máximo
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(preco.preco_maximo)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Estimativa baseada em distância, tipo de animal e histórico da plataforma.
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
