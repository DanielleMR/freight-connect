import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { CheckCircle, XCircle, Clock, Eye, FileText, Image, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type DocumentoStatus = 'pendente' | 'aprovado' | 'reprovado';
type DocumentoTipo = 'cpf_cnpj' | 'documento_pessoal' | 'cnh' | 'crlv' | 'documento_veiculo';

interface Documento {
  id: string;
  user_id: string;
  user_tipo: 'produtor' | 'transportador';
  tipo_documento: DocumentoTipo;
  arquivo_url: string;
  arquivo_nome: string;
  status: DocumentoStatus;
  motivo_reprovacao: string | null;
  created_at: string;
  updated_at: string;
}

const TIPO_LABELS: Record<DocumentoTipo, string> = {
  'cpf_cnpj': 'CPF/CNPJ',
  'documento_pessoal': 'Doc. Pessoal',
  'cnh': 'CNH',
  'crlv': 'CRLV',
  'documento_veiculo': 'Doc. Veículo'
};

const AdminDocumentos = () => {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  
  // Dialog states
  const [viewDialog, setViewDialog] = useState<Documento | null>(null);
  const [reprovarDialog, setReprovarDialog] = useState<Documento | null>(null);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDocumentos();
  }, []);

  const fetchDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocumentos((data || []) as Documento[]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async (doc: Documento) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('documentos')
        .update({
          status: 'aprovado',
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
          motivo_reprovacao: null
        })
        .eq('id', doc.id);

      if (error) throw error;
      
      toast.success('Documento aprovado!');
      fetchDocumentos();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReprovar = async () => {
    if (!reprovarDialog || !motivoReprovacao.trim()) {
      toast.error('Informe o motivo da reprovação');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('documentos')
        .update({
          status: 'reprovado',
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
          motivo_reprovacao: motivoReprovacao.trim()
        })
        .eq('id', reprovarDialog.id);

      if (error) throw error;
      
      toast.success('Documento reprovado');
      setReprovarDialog(null);
      setMotivoReprovacao('');
      fetchDocumentos();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: DocumentoStatus) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'reprovado':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Reprovado</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  const filteredDocumentos = documentos.filter(doc => {
    if (filterStatus !== 'all' && doc.status !== filterStatus) return false;
    if (filterTipo !== 'all' && doc.user_tipo !== filterTipo) return false;
    return true;
  });

  const pendentes = documentos.filter(d => d.status === 'pendente').length;

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Verificação de Documentos
              </CardTitle>
              <CardDescription>
                {pendentes > 0 ? (
                  <span className="text-amber-600">
                    {pendentes} documento(s) aguardando análise
                  </span>
                ) : (
                  'Nenhum documento pendente'
                )}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">⏳ Pendentes</SelectItem>
                  <SelectItem value="aprovado">✅ Aprovados</SelectItem>
                  <SelectItem value="reprovado">❌ Reprovados</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Tipo Usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="produtor">Produtores</SelectItem>
                  <SelectItem value="transportador">Transportadores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : filteredDocumentos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum documento encontrado com os filtros selecionados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo Usuário</TableHead>
                    <TableHead>Tipo Documento</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocumentos.map((doc) => (
                    <TableRow key={doc.id} className={doc.status === 'pendente' ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {doc.user_tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {TIPO_LABELS[doc.tipo_documento] || doc.tipo_documento}
                      </TableCell>
                      <TableCell>
                        <a 
                          href={doc.arquivo_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline text-sm flex items-center gap-1"
                        >
                          {doc.arquivo_nome.endsWith('.pdf') ? (
                            <FileText className="h-3 w-3" />
                          ) : (
                            <Image className="h-3 w-3" />
                          )}
                          {doc.arquivo_nome.length > 20 
                            ? doc.arquivo_nome.slice(0, 20) + '...' 
                            : doc.arquivo_nome}
                        </a>
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewDialog(doc)}
                            title="Ver documento"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          
                          {doc.status === 'pendente' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleAprovar(doc)}
                                disabled={processing}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setReprovarDialog(doc)}
                                disabled={processing}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reprovar
                              </Button>
                            </>
                          )}
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

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Visualizar Documento</DialogTitle>
            <DialogDescription>
              {viewDialog && TIPO_LABELS[viewDialog.tipo_documento]} - {viewDialog?.user_tipo}
            </DialogDescription>
          </DialogHeader>
          
          {viewDialog && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Status:</span>
                {getStatusBadge(viewDialog.status)}
              </div>
              
              {viewDialog.motivo_reprovacao && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-sm text-red-600">
                  <strong>Motivo da reprovação:</strong> {viewDialog.motivo_reprovacao}
                </div>
              )}
              
              <div className="border rounded-lg overflow-hidden">
                {viewDialog.arquivo_nome.endsWith('.pdf') ? (
                  <iframe 
                    src={viewDialog.arquivo_url} 
                    className="w-full h-[400px]"
                    title="Documento PDF"
                  />
                ) : (
                  <img 
                    src={viewDialog.arquivo_url} 
                    alt="Documento" 
                    className="max-w-full max-h-[400px] mx-auto"
                  />
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <a href={viewDialog.arquivo_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">Abrir em nova aba</Button>
                </a>
                {viewDialog.status === 'pendente' && (
                  <>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        handleAprovar(viewDialog);
                        setViewDialog(null);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        setReprovarDialog(viewDialog);
                        setViewDialog(null);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reprovar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reprovar Dialog */}
      <Dialog open={!!reprovarDialog} onOpenChange={() => {
        setReprovarDialog(null);
        setMotivoReprovacao('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Documento</DialogTitle>
            <DialogDescription>
              Informe o motivo da reprovação para que o usuário possa corrigir e reenviar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Textarea
                value={motivoReprovacao}
                onChange={(e) => setMotivoReprovacao(e.target.value)}
                placeholder="Ex: Documento ilegível, fora da validade, dados não conferem..."
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setReprovarDialog(null);
              setMotivoReprovacao('');
            }}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReprovar}
              disabled={processing || !motivoReprovacao.trim()}
            >
              {processing ? 'Processando...' : 'Confirmar Reprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDocumentos;
