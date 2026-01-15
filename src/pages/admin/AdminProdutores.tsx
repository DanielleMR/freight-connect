import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useNavigate } from "react-router-dom";
import { MapPin, Download } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";

interface Produtor {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  telefone: string;
  cidade: string | null;
  estado: string | null;
  created_at: string;
}

const AdminProdutores = () => {
  const navigate = useNavigate();
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchProdutores = async () => {
      try {
        const { data, error } = await supabase
          .from("produtores")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProdutores(data || []);
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

  const paginatedProdutores = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return produtores.slice(start, start + itemsPerPage);
  }, [produtores, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(produtores.length / itemsPerPage);

  const handleExportCSV = () => {
    const data = produtores.map(p => ({
      Nome: p.nome,
      'CPF/CNPJ': p.cpf_cnpj || '-',
      Telefone: p.telefone,
      Cidade: p.cidade || '-',
      Estado: p.estado || '-',
      'Cadastrado em': formatDate(p.created_at)
    }));
    exportToCSV(data, `produtores_${new Date().toISOString().split('T')[0]}`);
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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Produtores</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => navigate("/mapa/transportadores")}>
              <MapPin className="h-4 w-4 mr-2" />
              Ver Mapa
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Produtores ({produtores.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Carregando...</p>
            ) : produtores.length === 0 ? (
              <p className="text-muted-foreground">Nenhum produtor cadastrado.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProdutores.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell>{p.cpf_cnpj || "-"}</TableCell>
                        <TableCell>{p.telefone}</TableCell>
                        <TableCell>{p.cidade || "-"}</TableCell>
                        <TableCell>{p.estado || "-"}</TableCell>
                        <TableCell>{formatDate(p.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <AdminPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={produtores.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminProdutores;
