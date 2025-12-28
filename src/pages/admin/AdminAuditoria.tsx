import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Calendar, User, Database } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Auditoria {
  id: string;
  user_email: string | null;
  acao: string;
  tabela: string;
  registro_id: string | null;
  dados_anteriores: unknown;
  dados_novos: unknown;
  created_at: string;
}

const acaoColors: Record<string, string> = {
  INSERT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  EDIT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  LOGIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

const tabelaLabels: Record<string, string> = {
  transportadores: "Transportadores",
  produtores: "Produtores",
  fretes: "Fretes",
  avaliacoes: "Avaliações",
  user_roles: "Papéis de Usuário",
};

const AdminAuditoria = () => {
  const [auditoria, setAuditoria] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTabela, setFilterTabela] = useState<string>("");
  const [filterAcao, setFilterAcao] = useState<string>("");

  useEffect(() => {
    fetchAuditoria();
  }, []);

  const fetchAuditoria = async () => {
    try {
      const { data, error } = await supabase
        .from("auditoria")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setAuditoria(data || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao carregar auditoria";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR");
  };

  const filteredAuditoria = auditoria.filter((item) => {
    const matchesSearch = 
      !searchTerm || 
      item.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tabela.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTabela = !filterTabela || item.tabela === filterTabela;
    const matchesAcao = !filterAcao || item.acao.toUpperCase() === filterAcao;
    
    return matchesSearch && matchesTabela && matchesAcao;
  });

  const uniqueTabelas = [...new Set(auditoria.map(a => a.tabela))];
  const uniqueAcoes = [...new Set(auditoria.map(a => a.acao.toUpperCase()))];

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Auditoria do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, ação ou tabela..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTabela} onValueChange={setFilterTabela}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as tabelas</SelectItem>
                {uniqueTabelas.map((tabela) => (
                  <SelectItem key={tabela} value={tabela}>
                    {tabelaLabels[tabela] || tabela}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAcao} onValueChange={setFilterAcao}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filtrar ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as ações</SelectItem>
                {uniqueAcoes.map((acao) => (
                  <SelectItem key={acao} value={acao}>{acao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-center py-8">Carregando...</p>
          ) : filteredAuditoria.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum registro de auditoria encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuditoria.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm">{formatDate(item.created_at)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.user_email || "Sistema"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={acaoColors[item.acao.toUpperCase()] || ""}
                        >
                          {item.acao}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {tabelaLabels[item.tabela] || item.tabela}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono">
                          {item.registro_id ? item.registro_id.slice(0, 8) + "..." : "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground text-center">
            {filteredAuditoria.length} registro(s) encontrado(s)
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminAuditoria;
