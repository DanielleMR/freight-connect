import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Image,
  Camera,
  ExternalLink,
  ShieldCheck,
  User
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { getSignedUrl, getStoragePath } from '@/lib/signed-url';

type DocumentoTipo = 'cpf_cnpj' | 'documento_pessoal' | 'cnh' | 'crlv' | 'documento_veiculo';
type DocumentoStatus = 'pendente' | 'aprovado' | 'reprovado';

interface Documento {
  id: string;
  tipo_documento: DocumentoTipo;
  arquivo_url: string;
  arquivo_nome: string;
  status: DocumentoStatus;
  motivo_reprovacao: string | null;
  created_at: string;
  updated_at: string;
}

const DOCUMENTOS_CONFIG: Record<string, { tipo: DocumentoTipo; label: string; descricao: string; icon: typeof FileText }[]> = {
  produtor: [
    { tipo: 'cpf_cnpj', label: 'CPF ou CNPJ', descricao: 'Documento de identificação fiscal', icon: FileText },
    { tipo: 'documento_pessoal', label: 'Documento Pessoal com Foto', descricao: 'RG, CNH ou passaporte', icon: User },
  ],
  transportador: [
    { tipo: 'cnh', label: 'CNH – Carteira Nacional de Habilitação', descricao: 'Frente e verso, dentro da validade', icon: FileText },
    { tipo: 'crlv', label: 'CRLV – Certificado de Registro e Licenciamento', descricao: 'Documento do veículo em dia', icon: FileText },
    { tipo: 'documento_veiculo', label: 'Licença para Transporte de Animais', descricao: 'Documento específico para transporte boiadeiro', icon: FileText },
  ],
};

const LINKS_VERIFICACAO = [
  {
    label: 'Consultar CNH – Portal DETRAN',
    url: 'https://portalservicos.senatran.serpro.gov.br/',
    descricao: 'Verificar habilitação no sistema nacional',
  },
  {
    label: 'Consultar Veículo – DETRAN',
    url: 'https://portalservicos.senatran.serpro.gov.br/',
    descricao: 'Verificar registro e licenciamento do veículo',
  },
];

export default function VerificacaoDocumental() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [userTipo, setUserTipo] = useState<'produtor' | 'transportador'>('produtor');
  const [uploading, setUploading] = useState<DocumentoTipo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTipo, setCurrentTipo] = useState<DocumentoTipo | null>(null);

  useEffect(() => {
    if (user) {
      detectUserType();
    }
  }, [user]);

  const detectUserType = async () => {
    if (!user) return;

    // Check if transportador
    const { data: transp } = await supabase
      .from('transportadores')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (transp) {
      setUserTipo('transportador');
    } else {
      setUserTipo('produtor');
    }

    await fetchDocumentos();
    setLoading(false);
  };

  const fetchDocumentos = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('documentos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setDocumentos(data as Documento[]);
  };

  const getDocumentoByTipo = (tipo: DocumentoTipo) => documentos.find(d => d.tipo_documento === tipo);

  const handleUploadClick = (tipo: DocumentoTipo) => {
    setCurrentTipo(tipo);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTipo || !user) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Apenas imagens e PDFs são permitidos');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx. 10MB)');
      return;
    }

    setUploading(currentTipo);
    try {
      const fileName = `${user.id}/${currentTipo}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('documentos').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(fileName);

      const existingDoc = getDocumentoByTipo(currentTipo);
      let documentId: string | null = null;

      if (existingDoc && existingDoc.status === 'pendente') {
        await supabase.from('documentos').update({ arquivo_url: publicUrl, arquivo_nome: file.name, updated_at: new Date().toISOString() }).eq('id', existingDoc.id);
        documentId = existingDoc.id;
      } else {
        const { data: newDoc } = await supabase.from('documentos').insert({ user_id: user.id, user_tipo: userTipo, tipo_documento: currentTipo, arquivo_url: publicUrl, arquivo_nome: file.name, status: 'pendente' } as any).select('id').single();
        documentId = newDoc?.id || null;
      }

      toast.success('Documento enviado para análise!');
      await fetchDocumentos();

      // Trigger OCR verification automatically
      if (documentId && file.type.startsWith('image/')) {
        toast.info('Iniciando verificação OCR automática...');
        try {
          const ocrResponse = await supabase.functions.invoke('ocr-verify', {
            body: {
              documentId,
              imageUrl: publicUrl,
              tipoDocumento: currentTipo,
              userId: user.id,
            },
          });
          if (ocrResponse.data?.status) {
            const statusMap: Record<string, string> = {
              valido: '✅ Documento válido',
              divergencia: '⚠️ Divergência detectada – será analisado manualmente',
              expirado: '⏰ Documento expirado',
              ilegivel: '❌ Documento ilegível – reenvie com melhor qualidade',
            };
            toast.info(statusMap[ocrResponse.data.status] || 'OCR concluído');
          }
        } catch {
          // OCR failure is non-blocking
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar documento');
    } finally {
      setUploading(null);
      setCurrentTipo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusBadge = (status: DocumentoStatus) => {
    switch (status) {
      case 'aprovado': return <Badge className="bg-emerald-500 text-white">✅ Aprovado</Badge>;
      case 'reprovado': return <Badge variant="destructive">❌ Rejeitado</Badge>;
      default: return <Badge variant="secondary">⏳ Pendente</Badge>;
    }
  };

  const docConfig = DOCUMENTOS_CONFIG[userTipo] || [];
  const todosAprovados = docConfig.every(d => getDocumentoByTipo(d.tipo)?.status === 'aprovado');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>;
  }

  return (
    <>
      <Helmet>
        <title>Verificação Documental | FreteBoi</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Verificação Documental
              </h1>
              <p className="text-sm text-muted-foreground">
                {todosAprovados ? 'Todos os documentos aprovados' : 'Envie seus documentos para verificação'}
              </p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
          {/* Overall status */}
          <Card className={todosAprovados ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {todosAprovados ? (
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                )}
                <div>
                  <p className="font-semibold">
                    {todosAprovados ? 'Verificação completa' : 'Verificação pendente'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {todosAprovados
                      ? 'Você está habilitado para operar na plataforma.'
                      : 'Complete o envio dos documentos abaixo para poder aceitar contratos.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,.pdf" className="hidden" />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos Obrigatórios
              </CardTitle>
              <CardDescription>
                Perfil: <Badge variant="outline">{userTipo === 'produtor' ? 'Produtor' : 'Transportador'}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {docConfig.map((docInfo) => {
                const doc = getDocumentoByTipo(docInfo.tipo);
                const isUploading = uploading === docInfo.tipo;
                return (
                  <div key={docInfo.tipo} className={`p-4 rounded-lg border ${
                    doc?.status === 'aprovado' ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20'
                    : doc?.status === 'reprovado' ? 'border-red-200 bg-red-50 dark:bg-red-900/20'
                    : doc?.status === 'pendente' ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-muted'
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <docInfo.icon className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium">{docInfo.label}</h4>
                          {doc && getStatusBadge(doc.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{docInfo.descricao}</p>
                        {doc?.arquivo_nome && (
                          <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-1 flex items-center gap-1">
                            {doc.arquivo_nome.endsWith('.pdf') ? <FileText className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                            Ver arquivo enviado
                          </a>
                        )}
                        {doc?.status === 'reprovado' && doc.motivo_reprovacao && (
                          <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-sm text-red-600 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span>Motivo: {doc.motivo_reprovacao}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        {doc?.status === 'aprovado' ? (
                          <Button variant="outline" size="sm" disabled><CheckCircle className="h-4 w-4 mr-1" />OK</Button>
                        ) : (
                          <Button variant={doc ? 'outline' : 'default'} size="sm" onClick={() => handleUploadClick(docInfo.tipo)} disabled={isUploading}>
                            {isUploading ? 'Enviando...' : <><Upload className="h-4 w-4 mr-1" />{doc ? 'Reenviar' : 'Enviar'}</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Selfie with document */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Selfie com Documento
              </CardTitle>
              <CardDescription>
                Tire uma foto segurando seu documento de identidade ao lado do rosto (validação de identidade).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const selfieDoc = getDocumentoByTipo('documento_pessoal');
                return (
                  <Button variant="outline" className="w-full h-24 border-dashed" onClick={() => handleUploadClick('documento_pessoal')}>
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {selfieDoc ? 'Reenviar selfie com documento' : 'Enviar selfie com documento'}
                      </span>
                    </div>
                  </Button>
                );
              })()}
            </CardContent>
          </Card>

          {/* External verification links */}
          {userTipo === 'transportador' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Verificação Oficial
                </CardTitle>
                <CardDescription>Consulte a situação dos seus documentos nos portais oficiais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {LINKS_VERIFICACAO.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.descricao}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {/* OCR placeholder info */}
          <Card className="border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Validação OCR Automatizada</p>
                <p className="text-xs mt-1">
                  Os documentos enviados são verificados automaticamente via Google Vision API. 
                  Dados extraídos são comparados com o cadastro para detectar divergências.
                </p>
                <p className="text-xs mt-2 italic text-amber-700 dark:text-amber-400">
                  ⚖️ A verificação documental possui caráter informativo e não constitui certificação integral da idoneidade do transportador.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
