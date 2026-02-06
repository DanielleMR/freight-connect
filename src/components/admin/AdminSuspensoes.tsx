import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldBan, ShieldCheck, AlertTriangle, UserX } from "lucide-react";

interface Suspensao {
  id: string;
  user_id: string;
  motivo: string;
  ativo: boolean;
  created_at: string;
  removido_em: string | null;
}

export const AdminSuspensoes = () => {
  const [suspensoes, setSuspensoes] = useState<Suspensao[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [selected, setSelected] = useState<Suspensao | null>(null);
  const [userId, setUserId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSuspensoes = async () => {
    try {
      const { data, error } = await supabase
        .from("suspensoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSuspensoes(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar suspensões");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuspensoes();
  }, []);

  const handleCreate = async () => {
    if (!userId.trim() || !motivo.trim()) {
      toast.error("User ID e motivo são obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("suspensoes").insert({
        user_id: userId.trim(),
        motivo,
        suspenso_por: user?.id,
      });

      if (error) throw error;

      await supabase.rpc("inserir_auditoria_sistema", {
        p_acao: "suspensao_usuario",
        p_tabela: "suspensoes",
        p_dados_novos: { user_id: userId.trim(), motivo },
      });

      toast.success("Usuário suspenso com sucesso");
      setCreateOpen(false);
      setUserId("");
      setMotivo("");
      fetchSuspensoes();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!selected) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("suspensoes")
        .update({
          ativo: false,
          removido_por: user?.id,
          removido_em: new Date().toISOString(),
        })
        .eq("id", selected.id);

      if (error) throw error;

      await supabase.rpc("inserir_auditoria_sistema", {
        p_acao: "remocao_suspensao",
        p_tabela: "suspensoes",
        p_registro_id: selected.id,
        p_dados_anteriores: { ativo: true },
        p_dados_novos: { ativo: false },
      });

      toast.success("Suspensão removida");
      setRemoveOpen(false);
      setSelected(null);
      fetchSuspensoes();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShieldBan className="h-5 w-5" />
          Suspensões ({suspensoes.filter(s => s.ativo).length} ativas)
        </CardTitle>
        <Button size="sm" variant="destructive" onClick={() => setCreateOpen(true)}>
          <UserX className="h-4 w-4 mr-1" />
          Suspender Usuário
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Carregando...</p>
        ) : suspensoes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma suspensão registrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suspensoes.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.user_id.slice(0, 8)}...</TableCell>
                  <TableCell className="max-w-[200px] truncate">{s.motivo}</TableCell>
                  <TableCell>
                    {s.ativo ? (
                      <Badge variant="destructive">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Removida</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(s.created_at)}</TableCell>
                  <TableCell>
                    {s.ativo && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelected(s);
                          setRemoveOpen(true);
                        }}
                      >
                        <ShieldCheck className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Create Suspension */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Suspender Usuário
              </DialogTitle>
              <DialogDescription>
                Esta ação impedirá o usuário de operar no sistema. Será registrada na auditoria.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ID do Usuário (auth) *</Label>
                <Input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="UUID do usuário"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Motivo da Suspensão *</Label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva o motivo detalhadamente..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-destructive">⚠️ Ação irreversível no contexto operacional</p>
                <p className="text-muted-foreground mt-1">O usuário não poderá criar ou aceitar fretes enquanto suspenso.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleCreate} disabled={submitting || !userId.trim() || !motivo.trim()}>
                {submitting ? "Processando..." : "Confirmar Suspensão"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Suspension */}
        <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover Suspensão</DialogTitle>
              <DialogDescription>Confirma a remoção desta suspensão?</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Usuário:</span> {selected.user_id.slice(0, 12)}...</p>
                <p><span className="text-muted-foreground">Motivo:</span> {selected.motivo}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveOpen(false)}>Cancelar</Button>
              <Button onClick={handleRemove} disabled={submitting}>
                {submitting ? "Removendo..." : "Confirmar Remoção"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
