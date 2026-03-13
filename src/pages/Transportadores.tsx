import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Truck, MapPin, ArrowLeft, Search, Star, ShieldCheck, AlertTriangle, Crown, Filter, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { usePaginationState } from '@/hooks/usePaginatedQuery';

interface TransportadorV2 {
  id: string;
  public_id: string;
  nome: string;
  tipo_animal: string | null;
  regiao_atendimento: string | null;
  capacidade_animais: number | null;
  tipo_caminhao: string | null;
  ativo: boolean;
  latitude: number | null;
  longitude: number | null;
  media_nota: number;
  total_avaliacoes: number;
  total_fretes: number;
  docs_verificados: boolean;
  destaque_mapa: boolean;
  total_count: number;
}

const tiposCaminhao: Record<string, string> = {
  truck: 'Truck', carreta: 'Carreta', bitruck: 'Bitruck', romeu_julieta: 'Romeu e Julieta',
};
const tiposAnimal: Record<string, string> = {
  bovino: 'Bovino', suino: 'Suíno', equino: 'Equino', ovino: 'Ovino', caprino: 'Caprino',
};

export default function Transportadores() {
  const [transportadores, setTransportadores] = useState<TransportadorV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAnimal, setFilterAnimal] = useState<string>('');
  const [filterRegiao, setFilterRegiao] = useState('');
  const [filterCapacidade, setFilterCapacidade] = useState<string>('');
  const [filterAvaliacao, setFilterAvaliacao] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const pagination = usePaginationState(20);

  useEffect(() => {
    fetchTransportadores();
  }, [pagination.currentPage, pagination.itemsPerPage]);

  const fetchTransportadores = async (resetPage = false) => {
    if (resetPage) pagination.setPage(1);
    setLoading(true);

    const params: Record<string, any> = {
      p_limit: pagination.itemsPerPage,
      p_offset: resetPage ? 0 : pagination.offset,
    };
    if (search.trim()) params.p_search = search.trim();
    if (filterAnimal) params.p_tipo_animal = filterAnimal;
    if (filterRegiao.trim()) params.p_regiao = filterRegiao.trim();
    if (filterCapacidade) params.p_capacidade_min = parseInt(filterCapacidade);
    if (filterAvaliacao) params.p_avaliacao_min = parseFloat(filterAvaliacao);

    const { data, error } = await supabase.rpc('get_transportadores_directory_v2', params);

    if (error) {
      console.error('Error fetching transportadores:', error);
      setTransportadores([]);
    } else if (data && data.length > 0) {
      setTransportadores(data as TransportadorV2[]);
      pagination.setTotalItems(Number(data[0].total_count));
    } else {
      setTransportadores([]);
      pagination.setTotalItems(0);
    }
    setLoading(false);
  };

  const handleSearch = () => fetchTransportadores(true);
  const clearFilters = () => {
    setSearch('');
    setFilterAnimal('');
    setFilterRegiao('');
    setFilterCapacidade('');
    setFilterAvaliacao('');
    setTimeout(() => fetchTransportadores(true), 0);
  };
  const hasFilters = search || filterAnimal || filterRegiao || filterCapacidade || filterAvaliacao;

  const renderVerificationBadge = (t: TransportadorV2) => {
    if (t.docs_verificados) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 gap-1 text-xs">
          <ShieldCheck className="h-3 w-3" /> Verificado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300">
        <AlertTriangle className="h-3 w-3" /> Pendente
      </Badge>
    );
  };

  return (
    <>
      <Helmet>
        <title>Transportadores Verificados | FreteBoi</title>
        <meta name="description" content="Encontre transportadores verificados para transporte de animais no Brasil." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground p-4 shadow">
          <div className="container mx-auto flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Transportadores Disponíveis</h1>
          </div>
        </header>

        <main className="container mx-auto p-4">
          {/* Search bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cidade, estado, tipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch}>Buscar</Button>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tipo de Animal</label>
                    <Select value={filterAnimal} onValueChange={setFilterAnimal}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        {Object.entries(tiposAnimal).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Região</label>
                    <Input placeholder="Ex: MG, São Paulo" value={filterRegiao} onChange={(e) => setFilterRegiao(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Capacidade mínima</label>
                    <Select value={filterCapacidade} onValueChange={setFilterCapacidade}>
                      <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Qualquer</SelectItem>
                        <SelectItem value="10">10+ animais</SelectItem>
                        <SelectItem value="20">20+ animais</SelectItem>
                        <SelectItem value="50">50+ animais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Avaliação mínima</label>
                    <Select value={filterAvaliacao} onValueChange={setFilterAvaliacao}>
                      <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Qualquer</SelectItem>
                        <SelectItem value="3">⭐ 3+</SelectItem>
                        <SelectItem value="4">⭐ 4+</SelectItem>
                        <SelectItem value="4.5">⭐ 4.5+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleSearch}>Aplicar Filtros</Button>
                  {hasFilters && (
                    <Button size="sm" variant="ghost" onClick={clearFilters}>
                      <X className="h-3 w-3 mr-1" /> Limpar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center mb-6">
            <p className="text-muted-foreground text-sm">
              {pagination.totalItems} transportador(es) encontrado(s)
            </p>
            <Button variant="outline" onClick={() => navigate('/mapa-transportadores')}>
              <MapPin className="h-4 w-4 mr-2" />
              Ver no Mapa
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : transportadores.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum transportador encontrado{hasFilters ? ' com esses filtros' : ''}.
            </p>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {transportadores.map((t) => (
                  <Card key={t.public_id} className={`hover:shadow-lg transition-shadow ${t.destaque_mapa ? 'border-yellow-500 ring-1 ring-yellow-500/20' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            t.destaque_mapa ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-primary/10'
                          }`}>
                            <Truck className={`h-5 w-5 ${t.destaque_mapa ? 'text-yellow-600' : 'text-primary'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <h3 className="font-semibold text-sm">{t.nome}</h3>
                              {t.destaque_mapa && (
                                <Badge className="bg-yellow-500 text-xs gap-0.5 px-1.5 py-0">
                                  <Crown className="h-2.5 w-2.5" /> PRO
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">{t.public_id}</span>
                          </div>
                        </div>
                        {renderVerificationBadge(t)}
                      </div>

                      {/* Reputation */}
                      <div className="flex items-center gap-3 mb-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className={`h-3.5 w-3.5 ${Number(t.media_nota) > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                          <span className="font-medium">{Number(t.media_nota) > 0 ? t.media_nota : '-'}</span>
                          {Number(t.total_avaliacoes) > 0 && (
                            <span className="text-muted-foreground text-xs">({t.total_avaliacoes})</span>
                          )}
                        </div>
                        <span className="text-muted-foreground text-xs">
                          🚚 {t.total_fretes} frete(s)
                        </span>
                      </div>

                      {/* Info */}
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        {t.regiao_atendimento && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{t.regiao_atendimento}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {t.capacidade_animais && (
                            <Badge variant="outline" className="text-xs">{t.capacidade_animais} animais</Badge>
                          )}
                          {t.tipo_caminhao && (
                            <Badge variant="outline" className="text-xs">{tiposCaminhao[t.tipo_caminhao] || t.tipo_caminhao}</Badge>
                          )}
                          {t.tipo_animal && (
                            <Badge variant="outline" className="text-xs">{tiposAnimal[t.tipo_animal] || t.tipo_animal}</Badge>
                          )}
                        </div>
                      </div>

                      <Button className="w-full" onClick={() => navigate(`/solicitar-frete/${t.public_id}`)}>
                        Solicitar Frete
                      </Button>
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
                onItemsPerPageChange={pagination.setItemsPerPage}
                itemsPerPageOptions={[10, 20, 50]}
              />
            </>
          )}
        </main>
      </div>
    </>
  );
}
