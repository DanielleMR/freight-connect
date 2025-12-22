import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

interface Frete {
  id: string;
  origem: string | null;
  destino: string | null;
  quantidade_animais: number | null;
  status: string;
  created_at: string;
  transportador: {
    id: string;
    nome: string;
    telefone: string;
  } | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFretes = async () => {
      try {
        const response = await supabase.functions.invoke('admin/fretes', {
          method: 'GET',
        });

        if (response.error) throw response.error;
        setFretes(response.data || []);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFretes();
  }, []);

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
