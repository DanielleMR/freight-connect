import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

interface Transportador {
  id: string;
  nome: string;
  telefone: string;
  placa_veiculo: string | null;
  capacidade_animais: number | null;
  ativo: boolean;
  created_at: string;
}

const AdminTransportadores = () => {
  const [transportadores, setTransportadores] = useState<Transportador[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [placaVeiculo, setPlacaVeiculo] = useState("");
  const [capacidadeAnimais, setCapacidadeAnimais] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTransportadores = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('admin/transportadores', {
        method: 'GET',
      });

      if (response.error) throw response.error;
      setTransportadores(response.data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportadores();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await supabase.functions.invoke('admin/transportadores', {
        method: 'POST',
        body: {
          nome,
          telefone,
          placa_veiculo: placaVeiculo || null,
          capacidade_animais: capacidadeAnimais ? parseInt(capacidadeAnimais) : null,
        },
      });

      if (response.error) throw response.error;

      toast.success("Transportador criado com sucesso!");
      setNome("");
      setTelefone("");
      setPlacaVeiculo("");
      setCapacidadeAnimais("");
      fetchTransportadores();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const response = await supabase.functions.invoke(`admin/${id}/toggle`, {
        method: 'PATCH',
      });

      if (response.error) throw response.error;

      toast.success("Status atualizado!");
      fetchTransportadores();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Novo Transportador</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placa">Placa do Veículo</Label>
                <Input
                  id="placa"
                  value={placaVeiculo}
                  onChange={(e) => setPlacaVeiculo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacidade">Capacidade de Animais</Label>
                <Input
                  id="capacidade"
                  type="number"
                  value={capacidadeAnimais}
                  onChange={(e) => setCapacidadeAnimais(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Criando..." : "Criar Transportador"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transportadores</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Capacidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transportadores.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.nome}</TableCell>
                      <TableCell>{t.telefone}</TableCell>
                      <TableCell>{t.placa_veiculo || "-"}</TableCell>
                      <TableCell>{t.capacidade_animais || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={t.ativo ? "default" : "secondary"}>
                          {t.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggle(t.id)}
                        >
                          {t.ativo ? "Desativar" : "Ativar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminTransportadores;
