import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertTriangle, Image } from 'lucide-react';
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

interface DocumentUploadProps {
  userId: string;
  userTipo: 'produtor' | 'transportador';
  documentos: Documento[];
  onDocumentUploaded: () => void;
}

const DOCUMENTOS_PRODUTOR: { tipo: DocumentoTipo; label: string; descricao: string }[] = [
  { tipo: 'cpf_cnpj', label: 'CPF ou CNPJ', descricao: 'Documento de identificação fiscal' },
  { tipo: 'documento_pessoal', label: 'Documento Pessoal', descricao: 'RG, CNH ou passaporte' },
];

const DOCUMENTOS_TRANSPORTADOR: { tipo: DocumentoTipo; label: string; descricao: string }[] = [
  { tipo: 'cnh', label: 'CNH', descricao: 'Carteira Nacional de Habilitação' },
  { tipo: 'crlv', label: 'CRLV', descricao: 'Certificado de Registro e Licenciamento do Veículo' },
  { tipo: 'documento_veiculo', label: 'Documento do Veículo Boiadeiro', descricao: 'Licença para transporte de animais' },
];

export function DocumentUpload({ userId, userTipo, documentos, onDocumentUploaded }: DocumentUploadProps) {
  const [uploading, setUploading] = useState<DocumentoTipo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTipo, setCurrentTipo] = useState<DocumentoTipo | null>(null);

  const documentosNecessarios = userTipo === 'produtor' ? DOCUMENTOS_PRODUTOR : DOCUMENTOS_TRANSPORTADOR;

  const getDocumentoByTipo = (tipo: DocumentoTipo) => {
    return documentos.find(d => d.tipo_documento === tipo);
  };

  const getStatusIcon = (status: DocumentoStatus) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'reprovado':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: DocumentoStatus) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-500">✅ Aprovado</Badge>;
      case 'reprovado':
        return <Badge variant="destructive">❌ Reprovado</Badge>;
      default:
        return <Badge variant="secondary">⏳ Pendente</Badge>;
    }
  };

  const handleUploadClick = (tipo: DocumentoTipo) => {
    setCurrentTipo(tipo);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTipo) return;

    // Validar tipo
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Apenas imagens e PDFs são permitidos');
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx. 10MB)');
      return;
    }

    setUploading(currentTipo);

    try {
      // Upload para storage
      const fileName = getStoragePath(userId, currentTipo, file.name);
      
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the path, not a public URL - use signed URLs for viewing
      const storagePath = fileName;

      // Verificar se já existe documento desse tipo
      const existingDoc = getDocumentoByTipo(currentTipo);

      if (existingDoc && existingDoc.status === 'pendente') {
        const { error } = await supabase
          .from('documentos')
          .update({
            arquivo_url: storagePath,
            arquivo_nome: file.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDoc.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('documentos')
          .insert({
            user_id: userId,
            user_tipo: userTipo,
            tipo_documento: currentTipo,
            arquivo_url: storagePath,
            arquivo_nome: file.name,
            status: 'pendente'
          } as any);

        if (error) throw error;
      }

      toast.success('Documento enviado para análise!');
      onDocumentUploaded();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar documento');
    } finally {
      setUploading(null);
      setCurrentTipo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const todosAprovados = documentosNecessarios.every(
    doc => getDocumentoByTipo(doc.tipo)?.status === 'aprovado'
  );

  const algumPendente = documentosNecessarios.some(
    doc => getDocumentoByTipo(doc.tipo)?.status === 'pendente'
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Verificação de Documentos
        </CardTitle>
        <CardDescription>
          {todosAprovados ? (
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Todos os documentos aprovados! Você pode aceitar contratos.
            </span>
          ) : algumPendente ? (
            <span className="text-amber-600 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Documentos em análise. Aguarde aprovação para aceitar contratos.
            </span>
          ) : (
            <span className="text-muted-foreground">
              Envie os documentos necessários para poder aceitar contratos.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,.pdf"
          className="hidden"
        />

        {documentosNecessarios.map((docInfo) => {
          const documento = getDocumentoByTipo(docInfo.tipo);
          const isUploading = uploading === docInfo.tipo;
          
          return (
            <div
              key={docInfo.tipo}
              className={`p-4 rounded-lg border ${
                documento?.status === 'aprovado' 
                  ? 'border-green-200 bg-green-50 dark:bg-green-900/20' 
                  : documento?.status === 'reprovado'
                  ? 'border-red-200 bg-red-50 dark:bg-red-900/20'
                  : documento?.status === 'pendente'
                  ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-muted'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {documento ? getStatusIcon(documento.status) : (
                      <div className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground" />
                    )}
                    <h4 className="font-medium">{docInfo.label}</h4>
                    {documento && getStatusBadge(documento.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{docInfo.descricao}</p>
                  
                  {documento?.arquivo_nome && (
                    <a 
                      href={documento.arquivo_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline mt-1 flex items-center gap-1"
                    >
                      {documento.arquivo_nome.endsWith('.pdf') ? (
                        <FileText className="h-3 w-3" />
                      ) : (
                        <Image className="h-3 w-3" />
                      )}
                      Ver arquivo enviado
                    </a>
                  )}
                  
                  {documento?.status === 'reprovado' && documento.motivo_reprovacao && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>Motivo: {documento.motivo_reprovacao}</span>
                    </div>
                  )}
                </div>
                
                <div>
                  {documento?.status === 'aprovado' ? (
                    <Button variant="outline" size="sm" disabled>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprovado
                    </Button>
                  ) : (
                    <Button
                      variant={documento ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => handleUploadClick(docInfo.tipo)}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        'Enviando...'
                      ) : documento ? (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          Reenviar
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          Enviar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
