import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { FreteTimeline } from "@/components/frete/FreteTimeline";
import { Send, Edit, DollarSign, Calendar, Ruler, Eye, Download, XCircle, AlertTriangle, Filter } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { exportToCSV } from "@/lib/csv-export";
import { AdminForcarEncerramento } from "@/components/admin/AdminForcarEncerramento";
import { AdminFreteBlockDisputa } from "@/components/admin/AdminFreteBlockDisputa";

type FreteStatus = Database['public']['Enums']['frete_status'];

interface Frete {
  id: string;
  public_id: string;
  origem: string | null;
  destino: string | null;
  quantidade_animais: number | null;
  tipo_animal: string | null;
  valor_frete: number | null;
  tipo_cobranca: string | null;
  distancia_estimada: number | null;
  observacoes_valor: string | null;
  valor_contraproposta: number | null;
  data_prevista: string | null;
  status: FreteStatus;
  pagamento_confirmado: boolean;
  created_at: string;
  transportador_id: string;
  transportador: {
    id: string;
    nome: string;
    telefone: string;
  } | null;
}

interface Transportador {
  id: string;
  nome: string;
  ativo: boolean;
}

const AdminFretes = () => {
  const [fretes, setFretes] = useState<Frete[]>([]);
  const [transportadores, setTransportadores] = useState<Transportador[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFrete, setSelectedFrete] = useState<string | null>(null);
  const [selectedTransportador, setSelectedTransportador] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  
  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFrete, setEditFrete] = useState<Frete | null>(null);
  const [editValor, setEditValor] = useState("");
  const [editDistancia, setEditDistancia] = useState("");
  const [editTipoCobranca, setEditTipoCobranca] = useState("");
  const [editObservacoesValor, setEditObservacoesValor] = useState("");
  const [editData, setEditData] = useState("");
  const [editStatus, setEditStatus] = useState<FreteStatus>("solicitado");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewFrete, setViewFrete] = useState<Frete | null>(null);

  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelFrete, setCancelFrete] = useState<Frete | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelStep, setCancelStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [fretesComDisputa, setFretesComDisputa] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFretes();
    fetchTransportadores();
    fetchDisputas();
  }, []);

  const fetchDisputas = async () => {
    try {
      const { data } = await supabase
        .from("disputas")
        .select("frete_id")
        .in("status", ["aberta", "em_analise"]);

      if (data) {
        setFretesComDisputa(new Set(data.map(d => d.frete_id)));
      }
    } catch (err) {
      console.error("Error fetching disputas:", err);
    }
  };

  const fetchFretes = async () => {
    try {
      const { data, error } = await supabase
        .from("fretes")
        .select("*, transportador:transportadores(id, nome, telefone)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFretes(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransportadores = async () => {
    try {
      const { data, error } = await supabase
        .from("transportadores")
        .select("id, nome, ativo")
        .eq("ativo", true);

      if (error) throw error;
      setTransportadores(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar transportadores:", error);
    }
  };

  const handleOfertarFrete = async () => {
    if (!selectedFrete || !selectedTransportador) {
      toast.error("Selecione um transportador");
      return;
    }

    try {
      const { error } = await supabase
        .from("fretes")
        .update({ transportador_id: selectedTransportador, status: "solicitado" })
        .eq("id", selectedFrete);

      if (error) throw error;
      
      toast.success("Frete ofertado ao transportador!");
      setDialogOpen(false);
      setSelectedFrete(null);
      setSelectedTransportador("");
      fetchFretes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleOpenEdit = (frete: Frete) => {
    setEditFrete(frete);
    setEditValor(frete.valor_frete?.toString() || "");
    setEditDistancia(frete.distancia_estimada?.toString() || "");
    setEditTipoCobranca(frete.tipo_cobranca || "valor_fechado");
    setEditObservacoesValor(frete.observacoes_valor || "");
    setEditData(frete.data_prevista || "");
    setEditStatus(frete.status);
    setEditDialogOpen(true);
  };

  const handleOpenView = (frete: Frete) => {
    setViewFrete(frete);
    setViewDialogOpen(true);
  };

  const handleOpenCancel = (frete: Frete) => {
    setCancelFrete(frete);
    setCancelMotivo("");
    setCancelStep(1);
    setCancelDialogOpen(true);
  };

  const canCancel = (frete: Frete): boolean => {
    // Only allow cancellation for 'solicitado' or 'aceito' status
    return frete.status === 'solicitado' || frete.status === 'aceito';
  };

  const handleCancelFrete = async () => {
    if (!cancelFrete || !cancelMotivo.trim()) {
      toast.error("Motivo do cancelamento é obrigatório");
      return;
    }

    if (cancelStep === 1) {
      setCancelStep(2);
      return;
    }

    setSubmitting(true);
    try {
      // Update frete status to 'recusado' (closest to cancelled)
      const { error: updateError } = await supabase
        .from("fretes")
        .update({ 
          status: 'recusado',
          updated_at: new Date().toISOString()
        })
        .eq("id", cancelFrete.id);

      if (updateError) throw updateError;

      // Register audit log
      await supabase.rpc('inserir_auditoria_sistema', {
        p_acao: 'cancelamento_admin_frete',
        p_tabela: 'fretes',
        p_registro_id: cancelFrete.id,
        p_dados_anteriores: {
          status: cancelFrete.status,
          pagamento_confirmado: cancelFrete.pagamento_confirmado
        },
        p_dados_novos: {
          status: 'recusado',
          motivo_cancelamento: cancelMotivo,
          cancelado_por: 'admin'
        }
      });

      toast.success("Frete cancelado com sucesso!");
      setCancelDialogOpen(false);
      setCancelFrete(null);
      setCancelMotivo("");
      setCancelStep(1);
      fetchFretes();
    } catch (error: any) {
      toast.error(`Erro ao cancelar frete: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editFrete) return;

    try {
      const { error } = await supabase
        .from("fretes")
        .update({
          valor_frete: editValor ? parseFloat(editValor) : null,
          distancia_estimada: editDistancia ? parseFloat(editDistancia) : null,
          tipo_cobranca: editTipoCobranca || null,
          observacoes_valor: editObservacoesValor || null,
          data_prevista: editData || null,
          status: editStatus
        })
        .eq("id", editFrete.id);

      if (error) throw error;
      
      toast.success("Frete atualizado!");
      setEditDialogOpen(false);
      setEditFrete(null);
      fetchFretes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getTipoCobrancaLabel = (tipo: string | null) => {
    switch (tipo) {
      case "valor_fechado": return "Valor Fechado";
      case "valor_km": return "Valor por KM";
      default: return tipo || "-";
    }
  };

  const getStatusFinanceiro = (frete: Frete) => {
    if (frete.status === 'concluido') return { label: 'Concluído', color: 'text-green-600 bg-green-100' };
    if (frete.status === 'aceito' || frete.status === 'em_andamento') return { label: 'Aceito', color: 'text-blue-600 bg-blue-100' };
    if (frete.status === 'recusado') return { label: 'Recusado', color: 'text-red-600 bg-red-100' };
    return { label: 'Proposto', color: 'text-amber-600 bg-amber-100' };
  };

  const fretesFiltrados = useMemo(() => {
    if (filtroStatus === 'todos') return fretes;
    return fretes.filter(f => f.status === filtroStatus);
  }, [fretes, filtroStatus]);

  const paginatedFretes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return fretesFiltrados.slice(start, start + itemsPerPage);
  }, [fretesFiltrados, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(fretesFiltrados.length / itemsPerPage);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroStatus]);

  const handleExportCSV = () => {
    const data = fretesFiltrados.map(f => ({
      ID: f.public_id || '-',
      Origem: f.origem || '-',
      Destino: f.destino || '-',
      'Tipo Animal': f.tipo_animal || '-',
      'Qtd Animais': f.quantidade_animais || '-',
      Valor: f.valor_frete ? formatCurrency(f.valor_frete) : '-',
      Contraproposta: f.valor_contraproposta ? formatCurrency(f.valor_contraproposta) : '-',
      Status: f.status,
      Transportador: f.transportador?.nome || '-',
      'Data Prevista': formatDate(f.data_prevista),
      'Criado em': formatDate(f.created_at)
    }));
    exportToCSV(data, `fretes_${new Date().toISOString().split('T')[0]}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  return (
    <AdminLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Todos os Fretes ({fretesFiltrados.length})</CardTitle>
          <div className="flex gap-2">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="solicitado">Solicitado</SelectItem>
                <SelectItem value="aceito">Aceito</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="recusado">Recusado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : fretesFiltrados.length === 0 ? (
            <p className="text-muted-foreground">Nenhum frete encontrado.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Rota</TableHead>
                      <TableHead>Tipo Animal</TableHead>
                      <TableHead>Animais</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status Financeiro</TableHead>
                      <TableHead>Transportador</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Prevista</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFretes.map((f) => {
                      const statusFinanceiro = getStatusFinanceiro(f);
                      return (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs">{f.public_id}</TableCell>
                        <TableCell className="font-medium">
                          {f.origem || "-"} → {f.destino || "-"}
                        </TableCell>
                        <TableCell className="capitalize">{f.tipo_animal || "-"}</TableCell>
                        <TableCell>{f.quantidade_animais || "-"}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(f.valor_frete)}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusFinanceiro.color}`}>
                            {statusFinanceiro.label}
                          </span>
                        </TableCell>
                        <TableCell>{f.transportador?.nome || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <StatusBadge status={f.status} />
                            {fretesComDisputa.has(f.id) && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                Disputa
                              </Badge>
                            )}
                            {f.pagamento_confirmado && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-emerald-300 text-emerald-700">
                                Pago
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(f.data_prevista)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenView(f)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenEdit(f)}
                              title="Editar"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            
                            {canCancel(f) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenCancel(f)}
                                title="Cancelar Frete"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            )}
                            
                            <AdminForcarEncerramento
                              freteId={f.id}
                              fretePublicId={f.public_id}
                              freteStatus={f.status}
                              pagamentoConfirmado={f.pagamento_confirmado}
                              onSuccess={fetchFretes}
                            />
                            
                            <AdminFreteBlockDisputa
                              freteId={f.id}
                              fretePublicId={f.public_id}
                              onSuccess={fetchFretes}
                            />
                            
                            <Dialog open={dialogOpen && selectedFrete === f.id} onOpenChange={(open) => {
                              setDialogOpen(open);
                              if (!open) {
                                setSelectedFrete(null);
                                setSelectedTransportador("");
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedFrete(f.id)}
                                >
                                  <Send className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Ofertar Frete a Transportador</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div className="text-sm space-y-1">
                                    <p><strong>Origem:</strong> {f.origem || "-"}</p>
                                    <p><strong>Destino:</strong> {f.destino || "-"}</p>
                                    <p><strong>Animais:</strong> {f.quantidade_animais || "-"}</p>
                                    <p><strong>Valor:</strong> {formatCurrency(f.valor_frete)}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Selecionar Transportador</label>
                                    <Select value={selectedTransportador} onValueChange={setSelectedTransportador}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Escolha um transportador ativo" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {transportadores.map((t) => (
                                          <SelectItem key={t.id} value={t.id}>
                                            {t.nome}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button onClick={handleOfertarFrete} className="w-full">
                                    Confirmar Oferta
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>

              <AdminPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={fretesFiltrados.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Frete</DialogTitle>
          </DialogHeader>
          {viewFrete && (
            <div className="space-y-4 pt-4">
              <FreteTimeline status={viewFrete.status} />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">ID:</span><p className="font-mono">{viewFrete.public_id}</p></div>
                <div><span className="text-muted-foreground">Pagamento:</span><p className={viewFrete.pagamento_confirmado ? "text-green-600 font-medium" : "text-yellow-600"}>{viewFrete.pagamento_confirmado ? "Confirmado" : "Pendente"}</p></div>
                <div><span className="text-muted-foreground">Origem:</span><p className="font-medium">{viewFrete.origem}</p></div>
                <div><span className="text-muted-foreground">Destino:</span><p className="font-medium">{viewFrete.destino}</p></div>
                <div><span className="text-muted-foreground">Valor:</span><p className="font-medium text-green-600">{formatCurrency(viewFrete.valor_frete)}</p></div>
                <div><span className="text-muted-foreground">Tipo Cobrança:</span><p className="font-medium">{getTipoCobrancaLabel(viewFrete.tipo_cobranca)}</p></div>
                {viewFrete.valor_contraproposta && (
                  <div><span className="text-muted-foreground">Contraproposta:</span><p className="font-medium text-blue-600">{formatCurrency(viewFrete.valor_contraproposta)}</p></div>
                )}
                {viewFrete.distancia_estimada && (
                  <div><span className="text-muted-foreground">Distância:</span><p className="font-medium">{viewFrete.distancia_estimada} km</p></div>
                )}
              </div>
              {viewFrete.observacoes_valor && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Observações do Valor:</span>
                  <p className="text-sm">{viewFrete.observacoes_valor}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Frete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Read-only fields */}
            {editFrete && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">ID:</span> <span className="font-mono">{editFrete.public_id}</span></p>
                <p><span className="text-muted-foreground">Origem:</span> {editFrete.origem} → {editFrete.destino}</p>
                {editFrete.pagamento_confirmado && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                    <p className="text-xs font-medium text-yellow-800">⚠️ Pagamento confirmado — valor é somente leitura</p>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editValor"><DollarSign className="h-3 w-3 inline mr-1" />Valor (R$)</Label>
                <Input
                  id="editValor"
                  type="number"
                  step="0.01"
                  value={editValor}
                  onChange={(e) => setEditValor(e.target.value)}
                  disabled={editFrete?.pagamento_confirmado}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDistancia"><Ruler className="h-3 w-3 inline mr-1" />Distância (km)</Label>
                <Input id="editDistancia" type="number" value={editDistancia} onChange={(e) => setEditDistancia(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Cobrança</Label>
              <Select value={editTipoCobranca} onValueChange={setEditTipoCobranca} disabled={editFrete?.pagamento_confirmado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor_fechado">Valor Fechado</SelectItem>
                  <SelectItem value="valor_km">Valor por KM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editData"><Calendar className="h-3 w-3 inline mr-1" />Data Prevista</Label>
              <Input id="editData" type="date" value={editData} onChange={(e) => setEditData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as FreteStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solicitado">Solicitado</SelectItem>
                  <SelectItem value="aceito">Aceito</SelectItem>
                  <SelectItem value="recusado">Recusado</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveEdit} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Frete Dialog - 2 steps */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCancelDialogOpen(false);
          setCancelFrete(null);
          setCancelMotivo("");
          setCancelStep(1);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {cancelStep === 1 ? (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Cancelar Frete
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Confirmar Cancelamento
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {cancelStep === 1
                ? 'Informe o motivo do cancelamento. Esta ação requer confirmação.'
                : 'Revise os dados e confirme o cancelamento.'}
            </DialogDescription>
          </DialogHeader>

          {cancelFrete && (
            <div className="space-y-4">
              {/* Resumo do frete */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono">{cancelFrete.public_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rota:</span>
                  <span className="font-medium">{cancelFrete.origem} → {cancelFrete.destino}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status Atual:</span>
                  <StatusBadge status={cancelFrete.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transportador:</span>
                  <span className="font-medium">{cancelFrete.transportador?.nome || '-'}</span>
                </div>
                {cancelFrete.valor_frete && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-bold text-green-600">{formatCurrency(cancelFrete.valor_frete)}</span>
                  </div>
                )}
              </div>

              {/* Warning for 'aceito' with payment */}
              {cancelFrete.status === 'aceito' && cancelFrete.pagamento_confirmado && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">⚠️ Pagamento já confirmado!</p>
                      <p className="text-sm text-red-700 mt-1">
                        Este frete possui pagamento confirmado. O cancelamento pode ter implicações financeiras e jurídicas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {cancelStep === 1 ? (
                <div className="space-y-2">
                  <Label htmlFor="cancelMotivo">Motivo do Cancelamento *</Label>
                  <Textarea
                    id="cancelMotivo"
                    placeholder="Ex: Solicitação do produtor, erro de cadastro, problema com transportador..."
                    value={cancelMotivo}
                    onChange={(e) => setCancelMotivo(e.target.value)}
                    className="min-h-[100px]"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Este motivo será registrado na auditoria do sistema.
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Confirme o cancelamento</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Ao confirmar:
                      </p>
                      <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                        <li>O frete será marcado como "Recusado"</li>
                        <li>O registro será auditado com o motivo informado</li>
                        <li>Produtor e transportador serão afetados</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {cancelStep === 2 && (
              <Button variant="outline" onClick={() => setCancelStep(1)} disabled={submitting}>
                Voltar
              </Button>
            )}
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={submitting}>
              Não Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelFrete}
              disabled={submitting || (cancelStep === 1 && !cancelMotivo.trim())}
            >
              {submitting ? 'Processando...' : cancelStep === 1 ? 'Continuar' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminFretes;
