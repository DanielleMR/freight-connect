import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, CreditCard, Search, Filter, Crown, CheckCircle, Clock, AlertCircle, Download, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { exportToCSV, formatters } from '@/lib/csv-export';

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
  observacoes: string | null;
  transportador?: { nome: string; public_id: string; plano_tipo: string; };
  frete?: { public_id: string; origem: string; destino: string; };
}

export default function AdminFinanceiro() {
  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [transportadoresPro, setTransportadoresPro] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedPagamento, setSelectedPagamento] = useState<Pagamento | null>(null);
  const [confirmMotivo, setConfirmMotivo] = useState('');
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchPagamentos(); fetchEstatisticas(); }, []);

  const fetchPagamentos = async () => {
    const { data, error } = await supabase.from('pagamentos').select(`*, transportador:transportadores(nome, public_id, plano_tipo), frete:fretes(public_id, origem, destino)`).order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar pagamentos'); return; }
    setPagamentos(data as Pagamento[]); setLoading(false);
  };

  const fetchEstatisticas = async () => {
    const { count } = await supabase.from('transportadores').select('*', { count: 'exact', head: true }).eq('plano_tipo', 'pro');
    setTransportadoresPro(count || 0);
  };

  const handleOpenConfirmModal = (pagamento: Pagamento) => { setSelectedPagamento(pagamento); setConfirmMotivo(''); setConfirmStep(1); setConfirmModalOpen(true); };

  const handleConfirmPayment = async () => {
    if (!selectedPagamento || !confirmMotivo.trim()) { toast.error('Motivo da confirmação é obrigatório'); return; }
    if (confirmStep === 1) { setConfirmStep(2); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('confirmar_pagamento', { p_pagamento_id: selectedPagamento.id });
      if (error) throw error;
      await supabase.rpc('inserir_auditoria_sistema', { p_acao: 'confirmacao_manual_pagamento', p_tabela: 'pagamentos', p_registro_id: selectedPagamento.id, p_dados_novos: { motivo: confirmMotivo, valor: selectedPagamento.valor_total, tipo: selectedPagamento.tipo } });
      toast.success('Pagamento confirmado com sucesso!'); setConfirmModalOpen(false); setSelectedPagamento(null); setConfirmMotivo(''); setConfirmStep(1); fetchPagamentos();
    } catch (error: any) { toast.error(`Erro ao confirmar pagamento: ${error.message}`); } finally { setSubmitting(false); }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (date: string) => format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const getStatusBadge = (status: string) => { switch (status) { case 'pago': return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Pago</Badge>; case 'pendente': return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>; case 'cancelado': return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Cancelado</Badge>; default: return <Badge variant="secondary">{status}</Badge>; } };
  const getTipoBadge = (tipo: string) => tipo === 'assinatura' ? <Badge className="bg-yellow-500"><Crown className="h-3 w-3 mr-1" /> Assinatura</Badge> : <Badge variant="secondary"><CreditCard className="h-3 w-3 mr-1" /> Comissão</Badge>;

  const pagamentosFiltrados = useMemo(() => pagamentos.filter(p => { if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false; if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false; if (busca) { const termo = busca.toLowerCase(); return p.transportador?.nome.toLowerCase().includes(termo) || p.transportador?.public_id.toLowerCase().includes(termo) || p.frete?.public_id.toLowerCase().includes(termo); } return true; }), [pagamentos, filtroTipo, filtroStatus, busca]);
  const totalPages = Math.ceil(pagamentosFiltrados.length / itemsPerPage);
  const paginatedData = useMemo(() => { const start = (currentPage - 1) * itemsPerPage; return pagamentosFiltrados.slice(start, start + itemsPerPage); }, [pagamentosFiltrados, currentPage, itemsPerPage]);
  useEffect(() => { setCurrentPage(1); }, [filtroTipo, filtroStatus, busca]);

  const totalRecebido = pagamentos.filter(p => p.status === 'pago').reduce((acc, p) => acc + p.valor_total, 0);
  const totalPendente = pagamentos.filter(p => p.status === 'pendente').reduce((acc, p) => acc + p.valor_total, 0);
  const receitaComissoes = pagamentos.filter(p => p.tipo === 'comissao' && p.status === 'pago').reduce((acc, p) => acc + p.valor_total, 0);
  const receitaAssinaturas = pagamentos.filter(p => p.tipo === 'assinatura' && p.status === 'pago').reduce((acc, p) => acc + p.valor_total, 0);

  const handleExportCSV = () => { exportToCSV(pagamentosFiltrados, [{ header: 'Data', accessor: (row) => formatters.datetime(row.created_at) }, { header: 'Transportador', accessor: (row) => row.transportador?.nome || '' }, { header: 'Tipo', accessor: 'tipo' }, { header: 'Valor Total', accessor: (row) => formatters.currency(row.valor_total) }, { header: 'Status', accessor: 'status' }], 'financeiro'); };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div><h1 className="text-2xl font-bold">Financeiro</h1><p className="text-muted-foreground">Gestão de pagamentos e monetização</p></div>
          <Button onClick={handleExportCSV} variant="outline"><Download className="h-4 w-4 mr-2" />Exportar CSV</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Receita Total</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(totalRecebido)}</div><p className="text-xs text-muted-foreground">Pagamentos confirmados</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pendente</CardTitle><Clock className="h-4 w-4 text-yellow-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPendente)}</div><p className="text-xs text-muted-foreground">Aguardando pagamento</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Comissões</CardTitle><TrendingUp className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(receitaComissoes)}</div><p className="text-xs text-muted-foreground">8% por frete</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Assinaturas PRO</CardTitle><Crown className="h-4 w-4 text-yellow-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{transportadoresPro}</div><p className="text-xs text-muted-foreground">{formatCurrency(receitaAssinaturas)} arrecadado</p></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Pagamentos</CardTitle><CardDescription>Lista de todos os pagamentos da plataforma</CardDescription></CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por transportador ou frete..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" /></div>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}><SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os tipos</SelectItem><SelectItem value="comissao">Comissão</SelectItem><SelectItem value="assinatura">Assinatura</SelectItem></SelectContent></Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os status</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent></Select>
            </div>
            {loading ? <p className="text-center py-8 text-muted-foreground">Carregando...</p> : pagamentosFiltrados.length === 0 ? <p className="text-center py-8 text-muted-foreground">Nenhum pagamento encontrado.</p> : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Transportador</TableHead><TableHead>Tipo</TableHead><TableHead>Frete</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {paginatedData.map((pagamento) => (
                        <TableRow key={pagamento.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(pagamento.created_at)}</TableCell>
                          <TableCell><div><p className="font-medium">{pagamento.transportador?.nome}</p><p className="text-xs text-muted-foreground">{pagamento.transportador?.public_id}</p></div></TableCell>
                          <TableCell>{getTipoBadge(pagamento.tipo)}</TableCell>
                          <TableCell>{pagamento.frete ? <span className="font-mono text-sm">{pagamento.frete.public_id}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(pagamento.valor_total)}</TableCell>
                          <TableCell>{getStatusBadge(pagamento.status)}</TableCell>
                          <TableCell>{pagamento.status === 'pendente' && <Button size="sm" variant="outline" onClick={() => handleOpenConfirmModal(pagamento)} className="text-green-600 border-green-600 hover:bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Confirmar</Button>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <AdminPagination currentPage={currentPage} totalPages={totalPages} totalItems={pagamentosFiltrados.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={confirmModalOpen} onOpenChange={(open) => { if (!open) { setConfirmModalOpen(false); setSelectedPagamento(null); setConfirmMotivo(''); setConfirmStep(1); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2">{confirmStep === 1 ? <><DollarSign className="h-5 w-5 text-green-600" />Confirmar Pagamento Manual</> : <><AlertTriangle className="h-5 w-5 text-yellow-600" />Confirmar Ação</>}</DialogTitle><DialogDescription>{confirmStep === 1 ? 'Informe o motivo da confirmação manual. Esta ação é irreversível.' : 'Revise os dados e confirme a operação.'}</DialogDescription></DialogHeader>
          {selectedPagamento && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Transportador:</span><span className="font-medium">{selectedPagamento.transportador?.nome}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><span className="font-medium capitalize">{selectedPagamento.tipo}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Valor Total:</span><span className="font-bold text-green-600">{formatCurrency(selectedPagamento.valor_total)}</span></div>
              </div>
              {confirmStep === 1 ? <div className="space-y-2"><Label htmlFor="motivo">Motivo da Confirmação Manual *</Label><Textarea id="motivo" placeholder="Ex: Comprovante recebido via WhatsApp..." value={confirmMotivo} onChange={(e) => setConfirmMotivo(e.target.value)} className="min-h-[100px]" required /><p className="text-xs text-muted-foreground">Este motivo será registrado na auditoria.</p></div> : <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"><div className="flex gap-2"><AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" /><div><p className="font-medium text-yellow-800">Ação Irreversível</p><p className="text-sm text-yellow-700 mt-1">O pagamento será marcado como PAGO e o frete liberado.</p></div></div></div>}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">{confirmStep === 2 && <Button variant="outline" onClick={() => setConfirmStep(1)} disabled={submitting}>Voltar</Button>}<Button variant="outline" onClick={() => setConfirmModalOpen(false)} disabled={submitting}>Cancelar</Button><Button onClick={handleConfirmPayment} disabled={submitting || (confirmStep === 1 && !confirmMotivo.trim())} className={confirmStep === 2 ? 'bg-green-600 hover:bg-green-700' : ''}>{submitting ? 'Processando...' : confirmStep === 1 ? 'Continuar' : 'Confirmar Pagamento'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}