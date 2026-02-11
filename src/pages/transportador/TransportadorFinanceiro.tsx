import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, Crown, CreditCard, CheckCircle, Clock, AlertCircle, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pagamento {
  id: string;
  frete_id: string | null;
  tipo: string;
  valor_base: number | null;
  percentual_comissao: number | null;
  valor_comissao: number | null;
  valor_total: number;
  status: string;
  created_at: string;
  pago_em: string | null;
  frete?: {
    public_id: string;
    origem: string;
    destino: string;
  };
}

interface Transportador {
  id: string;
  nome: string;
  plano_tipo: string;
  plano_ativo_ate: string | null;
  destaque_mapa: boolean;
}

export default function TransportadorFinanceiro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transportador, setTransportador] = useState<Transportador | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [showAssinaturaDialog, setShowAssinaturaDialog] = useState(false);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: transp } = await supabase
      .from('transportadores')
      .select('id, nome, plano_tipo, plano_ativo_ate, destaque_mapa')
      .eq('user_id', user.id)
      .single();

    if (!transp) {
      navigate('/');
      return;
    }

    setTransportador(transp);
    await fetchPagamentos(transp.id);
    setLoading(false);
  };

  const fetchPagamentos = async (transportadorId: string) => {
    const { data } = await supabase
      .from('pagamentos')
      .select(`
        *,
        frete:fretes(public_id, origem, destino)
      `)
      .eq('transportador_id', transportadorId)
      .order('created_at', { ascending: false });

    if (data) {
      setPagamentos(data as Pagamento[]);
    }
  };

  const handleAssinarPro = async () => {
    if (!transportador) return;
    
    setProcessandoPagamento(true);
    
    try {
      const { data: pagamentoId, error } = await supabase.rpc('criar_assinatura_pro', {
        p_transportador_id: transportador.id
      });

      if (error) throw error;

      // Simular confirmação de pagamento (em produção, integrar com gateway)
      const { error: confirmError } = await supabase.rpc('confirmar_pagamento', {
        p_pagamento_id: pagamentoId
      });

      if (confirmError) throw confirmError;

      toast.success('Assinatura Pro ativada com sucesso!');
      setShowAssinaturaDialog(false);
      await checkAuth();
    } catch (error: any) {
      toast.error('Erro ao processar pagamento: ' + error.message);
    } finally {
      setProcessandoPagamento(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
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

  const isPlanoPro = transportador?.plano_tipo === 'pro' && 
    transportador?.plano_ativo_ate && 
    new Date(transportador.plano_ativo_ate) > new Date();

  const diasRestantes = transportador?.plano_ativo_ate 
    ? Math.ceil((new Date(transportador.plano_ativo_ate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const totalComissoesPagas = pagamentos
    .filter(p => p.tipo === 'comissao' && p.status === 'pago')
    .reduce((acc, p) => acc + (p.valor_total || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/transportador/painel')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Financeiro</h1>
            <p className="text-sm text-muted-foreground">{transportador?.nome}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Status do Plano */}
        <Card className={isPlanoPro ? 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isPlanoPro ? (
                  <Crown className="h-8 w-8 text-yellow-500" />
                ) : (
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Plano {isPlanoPro ? 'PRO' : 'Free'}
                    {isPlanoPro && <Badge className="bg-yellow-500">ATIVO</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {isPlanoPro 
                      ? `Válido por mais ${diasRestantes} dias`
                      : 'Comissão escalonada: 12% (até R$750) · 10% (R$751–R$2.000) · 8% (acima de R$2.000)'}
                  </CardDescription>
                </div>
              </div>
              {!isPlanoPro && (
                <Button 
                  className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
                  onClick={() => setShowAssinaturaDialog(true)}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Assinar PRO
                </Button>
              )}
            </div>
          </CardHeader>
          {isPlanoPro && (
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-green-600">0%</p>
                  <p className="text-xs text-muted-foreground">Comissão</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <Star className="h-6 w-6 mx-auto text-yellow-500" />
                  <p className="text-xs text-muted-foreground">Destaque no Mapa</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-primary">1º</p>
                  <p className="text-xs text-muted-foreground">Prioridade</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Resumo Financeiro */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Comissões Pagas</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(totalComissoesPagas)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Valor Líquido Recebido</CardDescription>
              <CardTitle className="text-2xl text-emerald-600">
                {formatCurrency(
                  pagamentos
                    .filter(p => p.tipo === 'comissao' && p.status === 'pago')
                    .reduce((acc, p) => acc + ((p.valor_base || 0) - (p.valor_comissao || 0)), 0)
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Fretes Realizados</CardDescription>
              <CardTitle className="text-2xl">
                {pagamentos.filter(p => p.tipo === 'comissao' && p.status === 'pago').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pagamentos Pendentes</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">
                {pagamentos.filter(p => p.status === 'pendente').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Commission breakdown per freight */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento de Comissões</CardTitle>
            <CardDescription>Valor total, comissão aplicada e líquido por frete</CardDescription>
          </CardHeader>
          <CardContent>
            {pagamentos.filter(p => p.tipo === 'comissao').length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma comissão registrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Frete</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Valor Total</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Taxa</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Comissão</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Líquido</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagamentos.filter(p => p.tipo === 'comissao').map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 px-2">{p.frete?.public_id || '—'}</td>
                        <td className="text-right py-2 px-2">{formatCurrency(p.valor_base || 0)}</td>
                        <td className="text-right py-2 px-2">{p.percentual_comissao}%</td>
                        <td className="text-right py-2 px-2 text-red-600">-{formatCurrency(p.valor_comissao || 0)}</td>
                        <td className="text-right py-2 px-2 font-semibold text-emerald-600">{formatCurrency((p.valor_base || 0) - (p.valor_comissao || 0))}</td>
                        <td className="text-right py-2 px-2">{getStatusBadge(p.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
            <CardDescription>Todos os pagamentos realizados na plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            {pagamentos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum pagamento registrado ainda.
              </p>
            ) : (
              <div className="space-y-4">
                {pagamentos.map((pagamento) => (
                  <div 
                    key={pagamento.id} 
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${pagamento.tipo === 'assinatura' ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                        {pagamento.tipo === 'assinatura' ? (
                          <Crown className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {pagamento.tipo === 'assinatura' 
                            ? 'Assinatura PRO Anual' 
                            : `Comissão - ${pagamento.frete?.public_id || 'Frete'}`}
                        </p>
                        {pagamento.frete && (
                          <p className="text-sm text-muted-foreground">
                            {pagamento.frete.origem} → {pagamento.frete.destino}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(pagamento.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(pagamento.valor_total)}</p>
                      {pagamento.tipo === 'comissao' && pagamento.percentual_comissao && (
                        <p className="text-xs text-muted-foreground">
                          {pagamento.percentual_comissao}% de {formatCurrency(pagamento.valor_base || 0)}
                        </p>
                      )}
                      <div className="mt-1">
                        {getStatusBadge(pagamento.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog de Assinatura PRO */}
      <Dialog open={showAssinaturaDialog} onOpenChange={setShowAssinaturaDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              Assinar Plano PRO
            </DialogTitle>
            <DialogDescription>
              Maximize seus ganhos com o plano PRO
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">Valor à vista</p>
                <p className="text-4xl font-bold text-yellow-600">R$ 1.500</p>
                <p className="text-sm text-muted-foreground">ou 12x de R$ 129,00</p>
              </div>
              
              <Separator className="my-4" />
              
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span><strong>0% de comissão</strong> em todos os fretes</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span><strong>Destaque</strong> no mapa de transportadores</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span><strong>Prioridade</strong> nas listagens</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Badge <strong>PRO</strong> exclusivo</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Válido por <strong>12 meses</strong></span>
                </li>
              </ul>
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                💰 Se você fizer mais de <strong>6 fretes de R$ 3.000</strong> por ano, 
                o plano PRO já se paga!
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssinaturaDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
              onClick={handleAssinarPro}
              disabled={processandoPagamento}
            >
              {processandoPagamento ? 'Processando...' : 'Confirmar Assinatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
