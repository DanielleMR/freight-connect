import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { Send } from "lucide-react";

interface Frete {
  id: string;
  origem: string | null;
  destino: string | null;
  quantidade_animais: number | null;
  status: string;
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

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  solicitado: "secondary",
  aceito: "default",
  recusado: "destructive",
  em_andamento: "outline",
  concluido: "default",
};

const AdminFretes = () => {
  const [fretes, setFretes] = useState<Frete[]>([]);
  const [transportadores, setTransportadores] = useState<Transportador[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFrete, setSelectedFrete] = useState<string | null>(null);
  const [selectedTransportador, setSelectedTransportador] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Animais</TableHead>
                  <TableHead>Transportador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fretes.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.origem || "-"}</TableCell>
                    <TableCell>{f.destino || "-"}</TableCell>
                    <TableCell>{f.quantidade_animais || "-"}</TableCell>
                    <TableCell>{f.transportador?.nome || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[f.status] || "secondary"}>
                        {f.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(f.created_at)}</TableCell>
                    <TableCell>
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
                            <Send className="h-3 w-3 mr-1" />
                            Ofertar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ofertar Frete a Transportador</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="text-sm">
                              <p><strong>Origem:</strong> {f.origem || "-"}</p>
                              <p><strong>Destino:</strong> {f.destino || "-"}</p>
                              <p><strong>Animais:</strong> {f.quantidade_animais || "-"}</p>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminFretes;
