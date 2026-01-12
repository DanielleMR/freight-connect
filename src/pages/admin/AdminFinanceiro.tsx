import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, Users, CreditCard, Search, Filter, Crown, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pagamento {
  id: string;
  transportador_id: string;
  frete_id: string | null;
  tipo: string;
  valor_base: number | null;
  percentual_comissao: number | null;
  valor_comissao: number | null;
  valor_total: number;
  status: string;
  created_at: string;
  pago_em: string | null;
  transportador?: {
    nome: string;
    public_id: string;
    plano_tipo: string;
  };
  frete?: {
    public_id: string;
    origem: string;
    destino: string;
  };
}

export default function AdminFinanceiro() {
  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [transportadoresPro, setTransportadoresPro] = useState(0);

  useEffect(() => {
    fetchPagamentos();
    fetchEstatisticas();
  }, []);

  const fetchPagamentos = async () => {
    const { data, error } = await supabase
      .from('pagamentos')
      .select(`
        *,
        transportador:transportadores(nome, public_id, plano_tipo),
        frete:fretes(public_id, origem, destino)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar pagamentos');
      return;
    }

    setPagamentos(data as Pagamento[]);
    setLoading(false);
  };

  const fetchEstatisticas = async () => {
    const { count } = await supabase
      .from('transportadores')
      .select('*', { count: 'exact', head: true })
      .eq('plano_tipo', 'pro');
    
    setTransportadoresPro(count || 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Pago</Badge>;
      case 'pendente':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'cancelado':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === 'assinatura') {
      return <Badge className="bg-yellow-500"><Crown className="h-3 w-3 mr-1" /> Assinatura</Badge>;
    }
    return <Badge variant="secondary"><CreditCard className="h-3 w-3 mr-1" /> Comissão</Badge>;
  };

  const pagamentosFiltrados = pagamentos.filter(p => {
    if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false;
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false;
    if (busca) {
      const termo = busca.toLowerCase();
      return (
        p.transportador?.nome.toLowerCase().includes(termo) ||
        p.transportador?.public_id.toLowerCase().includes(termo) ||
        p.frete?.public_id.toLowerCase().includes(termo)
      );
    }
    return true;
  });

  const totalRecebido = pagamentos
    .filter(p => p.status === 'pago')
    .reduce((acc, p) => acc + p.valor_total, 0);

  const totalPendente = pagamentos
    .filter(p => p.status === 'pendente')
    .reduce((acc, p) => acc + p.valor_total, 0);

  const receitaComissoes = pagamentos
    .filter(p => p.tipo === 'comissao' && p.status === 'pago')
    .reduce((acc, p) => acc + p.valor_total, 0);

  const receitaAssinaturas = pagamentos
    .filter(p => p.tipo === 'assinatura' && p.status === 'pago')
    .reduce((acc, p) => acc + p.valor_total, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Gestão de pagamentos e monetização</p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRecebido)}</div>
              <p className="text-xs text-muted-foreground">Pagamentos confirmados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPendente)}</div>
              <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissões</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(receitaComissoes)}</div>
              <p className="text-xs text-muted-foreground">8% por frete</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assinaturas PRO</CardTitle>
              <Crown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transportadoresPro}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(receitaAssinaturas)} arrecadado</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos</CardTitle>
            <CardDescription>Lista de todos os pagamentos da plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por transportador ou frete..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="comissao">Comissão</SelectItem>
                  <SelectItem value="assinatura">Assinatura</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : pagamentosFiltrados.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum pagamento encontrado.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Transportador</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Frete</TableHead>
                      <TableHead className="text-right">Valor Base</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagamentosFiltrados.map((pagamento) => (
                      <TableRow key={pagamento.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(pagamento.created_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{pagamento.transportador?.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {pagamento.transportador?.public_id}
                              {pagamento.transportador?.plano_tipo === 'pro' && (
                                <Badge className="ml-2 bg-yellow-500 text-xs">PRO</Badge>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getTipoBadge(pagamento.tipo)}</TableCell>
                        <TableCell>
                          {pagamento.frete ? (
                            <div>
                              <p className="font-mono text-sm">{pagamento.frete.public_id}</p>
                              <p className="text-xs text-muted-foreground">
                                {pagamento.frete.origem} → {pagamento.frete.destino}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {pagamento.valor_base ? formatCurrency(pagamento.valor_base) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {pagamento.percentual_comissao ? `${pagamento.percentual_comissao}%` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(pagamento.valor_total)}
                        </TableCell>
                        <TableCell>{getStatusBadge(pagamento.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
