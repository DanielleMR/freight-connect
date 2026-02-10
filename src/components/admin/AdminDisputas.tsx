import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Eye } from "lucide-react";

interface Disputa {
  id: string;
  frete_id: string;
  aberto_por: string;
  motivo: string;
  status: string;
  resolucao: string | null;
  created_at: string;
  resolvido_em: string | null;
}

interface UserDisputeCount {
  userId: string;
  count: number;
}

export const AdminDisputas = () => {
  const [disputas, setDisputas] = useState<Disputa[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [selected, setSelected] = useState<Disputa | null>(null);
  const [resolucao, setResolucao] = useState("");
  const [novoStatus, setNovoStatus] = useState("resolvida");
  const [submitting, setSubmitting] = useState(false);
  const [reincidentes, setReincidentes] = useState<UserDisputeCount[]>([]);

  const fetchDisputas = async () => {
    try {
      const { data, error } = await supabase
        .from("disputas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDisputas(data || []);

      // Calculate users with multiple disputes (reincidentes)
      const userCounts: Record<string, number> = {};
      (data || []).forEach(d => {
        userCounts[d.aberto_por] = (userCounts[d.aberto_por] || 0) + 1;
      });
      const multi = Object.entries(userCounts)
        .filter(([, count]) => count >= 2)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count);
      setReincidentes(multi);
    } catch (error: any) {
      toast.error("Erro ao carregar disputas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputas();
  }, []);

  const handleResolve = async () => {
    if (!selected || !resolucao.trim()) {
      toast.error("Resolução é obrigatória");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("disputas")
        .update({
          status: novoStatus,
          resolucao,
          resolvido_por: user?.id,
          resolvido_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id);

      if (error) throw error;

      // If resolving dispute, also block the freight
      if (novoStatus === "resolvida") {
        await supabase.rpc("inserir_auditoria_sistema", {
          p_acao: "disputa_resolvida",
          p_tabela: "disputas",
          p_registro_id: selected.id,
          p_dados_novos: {
            resolucao,
            status: novoStatus,
            frete_id: selected.frete_id,
          },
        });
      }

      toast.success("Disputa atualizada com sucesso");
      setResolveOpen(false);
      setSelected(null);
      setResolucao("");
      fetchDisputas();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aberta":
        return <Badge variant="destructive">Aberta</Badge>;
      case "em_analise":
        return <Badge className="bg-yellow-500">Em Análise</Badge>;
      case "resolvida":
        return <Badge className="bg-green-600">Resolvida</Badge>;
      case "cancelada":
        return <Badge variant="secondary">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Disputas ({disputas.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Reincidentes alert */}
        {reincidentes.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Usuários com múltiplas disputas
            </p>
            <div className="mt-2 space-y-1">
              {reincidentes.map(r => (
                <div key={r.userId} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-muted-foreground">{r.userId.slice(0, 12)}...</span>
                  <Badge variant="destructive" className="text-xs">{r.count} disputas</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p>Carregando...</p>
        ) : disputas.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma disputa registrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Frete</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aberta em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputas.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.frete_id.slice(0, 8)}...</TableCell>
                  <TableCell className="max-w-[200px] truncate">{d.motivo}</TableCell>
                  <TableCell>{getStatusBadge(d.status)}</TableCell>
                  <TableCell className="text-xs">{formatDate(d.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelected(d);
                          setResolveOpen(true);
                          setNovoStatus(d.status === "aberta" ? "em_analise" : "resolvida");
                        }}
                        disabled={d.status === "resolvida" || d.status === "cancelada"}
                      >
                        {d.status === "aberta" ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolver Disputa</DialogTitle>
              <DialogDescription>
                Informe a resolução. Esta ação será registrada na auditoria.
              </DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Motivo:</span> {selected.motivo}</p>
                  <p><span className="text-muted-foreground">Aberta em:</span> {formatDate(selected.created_at)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Novo Status</Label>
                  <Select value={novoStatus} onValueChange={setNovoStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="resolvida">Resolvida</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Resolução / Observações *</Label>
                  <Textarea
                    value={resolucao}
                    onChange={(e) => setResolucao(e.target.value)}
                    placeholder="Descreva a resolução ou medidas tomadas..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancelar</Button>
              <Button onClick={handleResolve} disabled={submitting || !resolucao.trim()}>
                {submitting ? "Salvando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
