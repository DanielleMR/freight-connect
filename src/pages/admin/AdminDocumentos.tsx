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
import { CheckCircle, XCircle, Clock, Eye, FileText, Image, Filter, Scan, ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';
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

interface OcrResult {
  id: string;
  document_id: string;
  extracted_data: any;
  comparison_result: any;
  status: string;
  ocr_service: string;
  created_at: string;
}

const TIPO_LABELS: Record<DocumentoTipo, string> = {
  cpf_cnpj: 'CPF/CNPJ',
  documento_pessoal: 'Doc. Pessoal',
  cnh: 'CNH',
  crlv: 'CRLV',
  documento_veiculo: 'Doc. Veículo',
};

const FIELD_LABELS: Record<string, string> = {
  cpf: 'CPF',
  nome: 'Nome',
  numeroCnh: 'Nº CNH',
  categoriaCnh: 'Categoria',
  dataValidade: 'Validade',
  placa: 'Placa',
  renavam: 'RENAVAM',
};

const AdminDocumentos = () => {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [viewDialog, setViewDialog] = useState<Documento | null>(null);
  const [reprovarDialog, setReprovarDialog] = useState<Documento | null>(null);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');
  const [processing, setProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState<Record<string, OcrResult>>({});
  const [runningOcr, setRunningOcr] = useState<string | null>(null);

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

      // Fetch OCR results
      const { data: verifications } = await supabase
        .from('document_verifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (verifications) {
        const map: Record<string, OcrResult> = {};
        for (const v of verifications as OcrResult[]) {
          if (!map[v.document_id]) map[v.document_id] = v;
        }
        setOcrResults(map);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunOcr = async (doc: Documento) => {
    setRunningOcr(doc.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('ocr-verify', {
        body: {
          documentId: doc.id,
          imageUrl: doc.arquivo_url,
          tipoDocumento: doc.tipo_documento,
          userId: doc.user_id,
        },
      });

      if (response.error) throw new Error(response.error.message);

      toast.success(`OCR concluído: ${response.data.status}`);
      await fetchDocumentos();
    } catch (error: any) {
      toast.error('Erro no OCR: ' + error.message);
    } finally {
      setRunningOcr(null);
    }
  };

  const handleAprovar = async (doc: Documento) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('documentos')
        .update({ status: 'aprovado', aprovado_por: user?.id, aprovado_em: new Date().toISOString(), motivo_reprovacao: null })
        .eq('id', doc.id);
      if (error) throw error;

      // Send email notification
      const { data: profile } = await supabase.from('profiles').select('email').eq('id', doc.user_id).maybeSingle();
      if (profile?.email) {
        await supabase.functions.invoke('send-email', {
          body: { type: 'documento_aprovado', userId: doc.user_id, recipientEmail: profile.email, details: { tipo: TIPO_LABELS[doc.tipo_documento] } },
        });
      }

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
        .update({ status: 'reprovado', aprovado_por: user?.id, aprovado_em: new Date().toISOString(), motivo_reprovacao: motivoReprovacao.trim() })
        .eq('id', reprovarDialog.id);
      if (error) throw error;

      // Send email notification
      const { data: profile } = await supabase.from('profiles').select('email').eq('id', reprovarDialog.user_id).maybeSingle();
      if (profile?.email) {
        await supabase.functions.invoke('send-email', {
          body: { type: 'documento_rejeitado', userId: reprovarDialog.user_id, recipientEmail: profile.email, details: { tipo: TIPO_LABELS[reprovarDialog.tipo_documento], motivo: motivoReprovacao.trim() } },
        });
      }

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
      case 'aprovado': return <Badge className="bg-emerald-500"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'reprovado': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Reprovado</Badge>;
      default: return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  const getOcrStatusBadge = (status: string) => {
    switch (status) {
      case 'valido': return <Badge className="bg-emerald-500">✅ Válido</Badge>;
      case 'divergencia': return <Badge className="bg-amber-500">⚠️ Divergência</Badge>;
      case 'expirado': return <Badge variant="destructive">⏰ Expirado</Badge>;
      case 'ilegivel': return <Badge variant="destructive">❌ Ilegível</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Verificação de Documentos</CardTitle>
              <CardDescription>
                {pendentes > 0 ? <span className="text-amber-600">{pendentes} documento(s) aguardando análise</span> : 'Nenhum documento pendente'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">⏳ Pendentes</SelectItem>
                  <SelectItem value="aprovado">✅ Aprovados</SelectItem>
                  <SelectItem value="reprovado">❌ Reprovados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Tipo Usuário" /></SelectTrigger>
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
          {loading ? <p>Carregando...</p> : filteredDocumentos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum documento encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo Usuário</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>OCR</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocumentos.map(doc => {
                    const ocr = ocrResults[doc.id];
                    return (
                      <TableRow key={doc.id} className={doc.status === 'pendente' ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                        <TableCell><Badge variant="outline" className="capitalize">{doc.user_tipo}</Badge></TableCell>
                        <TableCell>{TIPO_LABELS[doc.tipo_documento]}</TableCell>
                        <TableCell>
                          <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm flex items-center gap-1">
                            {doc.arquivo_nome.endsWith('.pdf') ? <FileText className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                            {doc.arquivo_nome.length > 15 ? doc.arquivo_nome.slice(0, 15) + '...' : doc.arquivo_nome}
                          </a>
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>{ocr ? getOcrStatusBadge(ocr.status) : <Badge variant="outline">—</Badge>}</TableCell>
                        <TableCell className="text-sm">{format(new Date(doc.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => setViewDialog(doc)} title="Ver"><Eye className="h-3 w-3" /></Button>
                            <Button variant="outline" size="sm" onClick={() => handleRunOcr(doc)} disabled={runningOcr === doc.id} title="Executar OCR">
                              {runningOcr === doc.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Scan className="h-3 w-3" />}
                            </Button>
                            {doc.status === 'pendente' && (
                              <>
                                <Button size="sm" onClick={() => handleAprovar(doc)} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700">
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => setReprovarDialog(doc)} disabled={processing}>
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog with OCR side-by-side */}
      <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Análise de Documento</DialogTitle>
            <DialogDescription>{viewDialog && TIPO_LABELS[viewDialog.tipo_documento]} — {viewDialog?.user_tipo}</DialogDescription>
          </DialogHeader>
          {viewDialog && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Status:</span>{getStatusBadge(viewDialog.status)}
                {ocrResults[viewDialog.id] && (
                  <>
                    <span className="text-muted-foreground">OCR:</span>
                    {getOcrStatusBadge(ocrResults[viewDialog.id].status)}
                  </>
                )}
              </div>

              {viewDialog.motivo_reprovacao && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-sm text-red-600">
                  <strong>Motivo:</strong> {viewDialog.motivo_reprovacao}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {/* Document preview */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Documento Enviado</h4>
                  <div className="border rounded-lg overflow-hidden">
                    {viewDialog.arquivo_nome.endsWith('.pdf') ? (
                      <iframe src={viewDialog.arquivo_url} className="w-full h-[350px]" title="Documento" />
                    ) : (
                      <img src={viewDialog.arquivo_url} alt="Documento" className="max-w-full max-h-[350px] mx-auto" />
                    )}
                  </div>
                </div>

                {/* OCR Results */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Resultado OCR</h4>
                  {ocrResults[viewDialog.id] ? (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        {getOcrStatusBadge(ocrResults[viewDialog.id].status)}
                        <span className="text-xs text-muted-foreground">via {ocrResults[viewDialog.id].ocr_service}</span>
                      </div>

                      {/* Extracted data */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Dados Extraídos:</p>
                        {Object.entries(ocrResults[viewDialog.id].extracted_data || {}).map(([key, val]) => (
                          val && (
                            <div key={key} className="flex justify-between text-sm py-1 border-b last:border-0">
                              <span className="text-muted-foreground">{FIELD_LABELS[key] || key}</span>
                              <span className="font-mono">{String(val)}</span>
                            </div>
                          )
                        ))}
                      </div>

                      {/* Comparison */}
                      {ocrResults[viewDialog.id].comparison_result && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Comparação com Cadastro:</p>
                          {ocrResults[viewDialog.id].comparison_result.matches?.map((m: string) => (
                            <div key={m} className="flex items-center gap-2 text-sm text-emerald-600 py-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>{FIELD_LABELS[m] || m}: Confere</span>
                            </div>
                          ))}
                          {ocrResults[viewDialog.id].comparison_result.divergences?.map((d: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-red-600 py-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{FIELD_LABELS[d.field] || d.field}: <strong>{d.extracted || '?'}</strong> <ArrowRight className="h-3 w-3 inline" /> <strong>{d.registered || '?'}</strong></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border rounded-lg p-8 text-center text-muted-foreground">
                      <Scan className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">OCR não executado</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRunOcr(viewDialog)} disabled={runningOcr === viewDialog.id}>
                        {runningOcr === viewDialog.id ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Processando...</> : <><Scan className="h-3 w-3 mr-1" />Executar OCR</>}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Legal disclaimer */}
              <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground text-center">
                ⚖️ A verificação documental possui caráter informativo e não constitui certificação integral da idoneidade do transportador.
              </div>

              <div className="flex justify-end gap-2">
                <a href={viewDialog.arquivo_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">Abrir em nova aba</Button>
                </a>
                {viewDialog.status === 'pendente' && (
                  <>
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleAprovar(viewDialog); setViewDialog(null); }}>
                      <CheckCircle className="h-4 w-4 mr-1" />Aprovar
                    </Button>
                    <Button variant="destructive" onClick={() => { setReprovarDialog(viewDialog); setViewDialog(null); }}>
                      <XCircle className="h-4 w-4 mr-1" />Reprovar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reprovar Dialog */}
      <Dialog open={!!reprovarDialog} onOpenChange={() => { setReprovarDialog(null); setMotivoReprovacao(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Documento</DialogTitle>
            <DialogDescription>Informe o motivo da reprovação.</DialogDescription>
          </DialogHeader>
          <Textarea value={motivoReprovacao} onChange={e => setMotivoReprovacao(e.target.value)} placeholder="Ex: Documento ilegível, fora da validade..." rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReprovarDialog(null); setMotivoReprovacao(''); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReprovar} disabled={processing || !motivoReprovacao.trim()}>
              {processing ? 'Processando...' : 'Confirmar Reprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDocumentos;
