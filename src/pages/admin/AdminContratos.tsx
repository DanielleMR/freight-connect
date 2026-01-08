import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Eye, CheckCircle, Clock, Search, Filter, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Contrato {
  id: string;
  frete_id: string;
  produtor_id: string;
  transportador_id: string;
  texto_contrato: string;
  versao_contrato: string;
  status: 'pendente' | 'aceito';
  aceito_por_user_id: string | null;
  aceito_em: string | null;
  ip_aceite: string | null;
  created_at: string;
  produtores?: { nome: string };
  transportadores?: { nome: string };
  fretes?: { origem: string | null; destino: string | null };
}

export default function AdminContratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null);

  useEffect(() => {
    fetchContratos();
  }, []);

  const fetchContratos = async () => {
    const { data, error } = await supabase
      .from('contratos')
      .select(`
        *,
        produtores(nome),
        transportadores(nome),
        fretes(origem, destino)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setContratos(data as unknown as Contrato[]);
    }
    setLoading(false);
  };

  const contratosFiltrados = contratos.filter(contrato => {
    // Filtro por status
    if (filtroStatus !== 'todos' && contrato.status !== filtroStatus) {
      return false;
    }
    
    // Filtro por texto
    if (filtroTexto) {
      const termo = filtroTexto.toLowerCase();
      return (
        contrato.produtores?.nome?.toLowerCase().includes(termo) ||
        contrato.transportadores?.nome?.toLowerCase().includes(termo) ||
        contrato.fretes?.origem?.toLowerCase().includes(termo) ||
        contrato.fretes?.destino?.toLowerCase().includes(termo)
      );
    }
    
    return true;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Carregando contratos...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Contratos Digitais</h1>
          </div>
          
          {/* Resumo */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <span>{contratos.filter(c => c.status === 'pendente').length} Pendentes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span>{contratos.filter(c => c.status === 'aceito').length} Aceitos</span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por produtor, transportador ou rota..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="aceito">Aceitos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Contratos */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Contratos ({contratosFiltrados.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {contratosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum contrato encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rota</TableHead>
                    <TableHead>Produtor</TableHead>
                    <TableHead>Transportador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Criação</TableHead>
                    <TableHead>Data Aceite</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratosFiltrados.map((contrato) => (
                    <TableRow key={contrato.id}>
                      <TableCell className="font-medium">
                        {contrato.fretes?.origem} → {contrato.fretes?.destino}
                      </TableCell>
                      <TableCell>{contrato.produtores?.nome || '-'}</TableCell>
                      <TableCell>{contrato.transportadores?.nome || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={contrato.status === 'aceito' ? 'default' : 'secondary'}>
                          {contrato.status === 'aceito' ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Aceito</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(contrato.created_at)}</TableCell>
                      <TableCell>{formatDate(contrato.aceito_em)}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setContratoSelecionado(contrato)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Contrato Digital
                                <Badge variant={contrato.status === 'aceito' ? 'default' : 'secondary'} className="ml-2">
                                  {contrato.status === 'aceito' ? 'Aceito' : 'Pendente'}
                                </Badge>
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-4 mt-4">
                              {/* Informações do Registro Jurídico */}
                              {contrato.status === 'aceito' && (
                                <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-3">
                                      <Shield className="h-5 w-5" />
                                      <span className="font-semibold">Registro Jurídico do Aceite</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">ID do Usuário:</span>
                                        <p className="font-mono text-xs break-all">{contrato.aceito_por_user_id}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Data/Hora do Aceite:</span>
                                        <p>{formatDate(contrato.aceito_em)}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">IP Registrado:</span>
                                        <p className="font-mono">{contrato.ip_aceite || 'Não disponível'}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Versão do Contrato:</span>
                                        <p>{contrato.versao_contrato}</p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                              
                              {/* Texto do Contrato */}
                              <div className="bg-muted/30 border rounded-lg p-4 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[50vh]">
                                {contrato.texto_contrato}
                              </div>
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
      </div>
    </AdminLayout>
  );
}
