import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Truck, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { usePaginationState } from '@/hooks/usePaginatedQuery';

interface FretePublico {
  public_id: string;
  origem: string;
  destino: string;
  tipo_animal: string | null;
  quantidade_animais: number | null;
  data_prevista: string | null;
  status: string;
  created_at: string;
  total_count: number;
}

export default function FretesDisponiveis() {
  const [fretes, setFretes] = useState<FretePublico[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const pagination = usePaginationState(20);

  useEffect(() => {
    fetchFretes();
  }, [pagination.currentPage, pagination.itemsPerPage]);

  const fetchFretes = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_fretes_disponiveis', {
      p_limit: pagination.itemsPerPage,
      p_offset: pagination.offset,
    });

    if (error) {
      console.error('Error fetching fretes:', error);
    } else if (data && data.length > 0) {
      setFretes(data);
      pagination.setTotalItems(Number(data[0].total_count));
    } else {
      setFretes([]);
      pagination.setTotalItems(0);
    }
    setLoading(false);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  const tiposAnimal: Record<string, string> = {
    bovino: 'Bovino', suino: 'Suíno', equino: 'Equino', ovino: 'Ovino', caprino: 'Caprino',
  };

  return (
    <>
      <Helmet>
        <title>Fretes disponíveis para transporte de animais | FreteBoi</title>
        <meta name="description" content="Encontre fretes disponíveis para transporte de animais no Brasil. Conecte-se com produtores verificados." />
        <meta property="og:title" content="Fretes Disponíveis — FreteBoi" />
        <meta property="og:description" content="Encontre fretes disponíveis para transporte de animais no Brasil." />
        <link rel="canonical" href="https://freteboi.com.br/fretes-disponiveis" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground p-4 shadow">
          <div className="container mx-auto flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Fretes Disponíveis</h1>
              <p className="text-sm opacity-80">Transporte de animais em todo o Brasil</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4">
          <div className="mb-6">
            <p className="text-muted-foreground">
              {pagination.totalItems} frete(s) disponível(is) para transporte
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : fretes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum frete disponível no momento.</p>
                <p className="text-sm text-muted-foreground mt-1">Volte mais tarde para novas oportunidades.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fretes.map((f) => (
                  <Card key={f.public_id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs text-muted-foreground font-mono">{f.public_id}</span>
                        <Badge variant="secondary" className="text-xs">Disponível</Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="font-medium">{f.origem || '-'} → {f.destino || '-'}</span>
                        </div>

                        {f.data_prevista && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(f.data_prevista)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {f.tipo_animal && (
                          <Badge variant="outline" className="text-xs">
                            {tiposAnimal[f.tipo_animal] || f.tipo_animal}
                          </Badge>
                        )}
                        {f.quantidade_animais && (
                          <Badge variant="outline" className="text-xs">
                            {f.quantidade_animais} animais
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-3">
                        Publicado em {formatDate(f.created_at)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <AdminPagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.setPage}
              />
            </>
          )}
        </main>
      </div>
    </>
  );
}
