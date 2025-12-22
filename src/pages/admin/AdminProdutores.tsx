import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

interface Produtor {
  id: string;
  email: string;
  created_at: string;
  role: string;
}

const AdminProdutores = () => {
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProdutores = async () => {
      try {
        const response = await supabase.functions.invoke('admin/produtores', {
          method: 'GET',
        });

        if (response.error) throw response.error;
        setProdutores(response.data || []);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProdutores();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Produtores</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : produtores.length === 0 ? (
            <p className="text-muted-foreground">Nenhum produtor cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtores.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>{formatDate(p.created_at)}</TableCell>
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

export default AdminProdutores;
