import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { Send, Edit, DollarSign, Calendar } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type FreteStatus = Database['public']['Enums']['frete_status'];

interface Frete {
  id: string;
  origem: string | null;
  destino: string | null;
  quantidade_animais: number | null;
  tipo_animal: string | null;
  valor_frete: number | null;
  data_prevista: string | null;
  status: FreteStatus;
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
  
  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFrete, setEditFrete] = useState<Frete | null>(null);
  const [editValor, setEditValor] = useState("");
  const [editData, setEditData] = useState("");
  const [editStatus, setEditStatus] = useState<FreteStatus>("solicitado");

  useEffect(() => {
    fetchFretes();
    fetchTransportadores();
  }, []);

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
    setEditData(frete.data_prevista || "");
    setEditStatus(frete.status);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFrete) return;

    try {
      const { error } = await supabase
        .from("fretes")
        .update({
          valor_frete: editValor ? parseFloat(editValor) : null,
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

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Todos os Fretes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : fretes.length === 0 ? (
            <p className="text-muted-foreground">Nenhum frete encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origem</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Tipo Animal</TableHead>
                    <TableHead>Animais</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Transportador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fretes.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.origem || "-"}</TableCell>
                      <TableCell>{f.destino || "-"}</TableCell>
                      <TableCell className="capitalize">{f.tipo_animal || "-"}</TableCell>
                      <TableCell>{f.quantidade_animais || "-"}</TableCell>
                      <TableCell>{formatCurrency(f.valor_frete)}</TableCell>
                      <TableCell>{formatDate(f.data_prevista)}</TableCell>
                      <TableCell>{f.transportador?.nome || "-"}</TableCell>
                      <TableCell>
                        <StatusBadge status={f.status} />
                      </TableCell>
                      <TableCell>{formatDate(f.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenEdit(f)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Frete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="editValor" className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Valor do Frete (R$)
              </Label>
              <Input
                id="editValor"
                type="number"
                step="0.01"
                value={editValor}
                onChange={(e) => setEditValor(e.target.value)}
                placeholder="Ex: 1500.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editData" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Data Prevista
              </Label>
              <Input
                id="editData"
                type="date"
                value={editData}
                onChange={(e) => setEditData(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as FreteStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solicitado">Solicitado</SelectItem>
                  <SelectItem value="aceito">Aceito</SelectItem>
                  <SelectItem value="recusado">Recusado</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveEdit} className="w-full">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminFretes;
