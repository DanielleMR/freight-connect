import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Send, Paperclip, AlertTriangle, Image, FileText, X } from 'lucide-react';
import { validateChatMessage, sanitizeFileName } from '@/lib/chat-filters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  frete_id: string;
  sender_user_id: string;
  sender_tipo: 'produtor' | 'transportador' | 'admin';
  conteudo: string;
  bloqueada: boolean;
  motivo_bloqueio: string | null;
  arquivo_url: string | null;
  arquivo_tipo: string | null;
  created_at: string;
}

interface FreteChatProps {
  freteId: string;
  fretePublicId: string;
  currentUserId: string;
  currentUserType: 'produtor' | 'transportador' | 'admin';
}

export function FreteChat({ freteId, fretePublicId, currentUserId, currentUserType }: FreteChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Realtime subscription
    const channel = supabase
      .channel(`chat-${freteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_chat',
          filter: `frete_id=eq.${freteId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [freteId]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('mensagens_chat')
      .select('*')
      .eq('frete_id', freteId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar mensagens:', error);
    } else {
      setMessages((data || []) as Message[]);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    // Validar mensagem
    const validation = validateChatMessage(newMessage);
    
    setSending(true);

    try {
      let arquivoUrl: string | null = null;
      let arquivoTipo: string | null = null;

      // Upload de arquivo se houver
      if (selectedFile) {
        setUploading(true);
        const fileName = `${freteId}/${Date.now()}_${sanitizeFileName(selectedFile.name)}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-anexos')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        // Store the path - signed URLs generated on display
        arquivoUrl = fileName;
        arquivoTipo = selectedFile.type.startsWith('image/') ? 'image' : 'pdf';
        setUploading(false);
      }

      // Inserir mensagem (bloqueada ou não)
      const { error } = await supabase
        .from('mensagens_chat')
        .insert({
          frete_id: freteId,
          sender_user_id: currentUserId,
          sender_tipo: currentUserType,
          conteudo: newMessage.trim() || (arquivoUrl ? '[Arquivo anexado]' : ''),
          bloqueada: validation.isBlocked,
          motivo_bloqueio: validation.reason,
          arquivo_url: arquivoUrl,
          arquivo_tipo: arquivoTipo
        });

      if (error) throw error;

      if (validation.isBlocked) {
        toast.error('🚫 Contato externo não é permitido. Use apenas o chat da plataforma.');
      }

      setNewMessage('');
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error('Apenas imagens e PDFs são permitidos');
        return;
      }
      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande (máx. 5MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const getSenderLabel = (tipo: string) => {
    switch (tipo) {
      case 'produtor': return 'Produtor';
      case 'transportador': return 'Transportador';
      case 'admin': return 'Suporte';
      default: return tipo;
    }
  };

  const getSenderColor = (tipo: string) => {
    switch (tipo) {
      case 'produtor': return 'bg-blue-500';
      case 'transportador': return 'bg-green-500';
      case 'admin': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          💬 Chat do Frete
          <Badge variant="outline" className="font-mono text-xs">{fretePublicId}</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Mensagens */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma mensagem ainda. Inicie a conversa!
              </p>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_user_id === currentUserId;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.bloqueada 
                          ? 'bg-red-100 dark:bg-red-900/30 border border-red-300' 
                          : isOwn 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                      }`}
                    >
                      {!isOwn && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${getSenderColor(msg.sender_tipo)}`} />
                          <span className="text-xs font-medium opacity-70">
                            {getSenderLabel(msg.sender_tipo)}
                          </span>
                        </div>
                      )}
                      
                      {msg.bloqueada ? (
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-red-600 dark:text-red-400 line-through">
                              {msg.conteudo}
                            </p>
                            <p className="text-xs text-red-500 mt-1">
                              🚫 Mensagem bloqueada: {msg.motivo_bloqueio}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.conteudo}</p>
                          
                          {msg.arquivo_url && (
                            <div className="mt-2">
                              {msg.arquivo_tipo === 'image' ? (
                                <a href={msg.arquivo_url} target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={msg.arquivo_url} 
                                    alt="Anexo" 
                                    className="max-w-full max-h-48 rounded cursor-pointer hover:opacity-80 transition-opacity"
                                  />
                                </a>
                              ) : (
                                <a 
                                  href={msg.arquivo_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs underline"
                                >
                                  <FileText className="h-4 w-4" />
                                  Ver PDF anexado
                                </a>
                              )}
                            </div>
                          )}
                        </>
                      )}
                      
                      <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Aviso de segurança */}
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Compartilhar contatos externos (telefone, email, WhatsApp) é bloqueado automaticamente.
          </p>
        </div>

        {/* Arquivo selecionado */}
        {selectedFile && (
          <div className="px-4 py-2 bg-muted flex items-center gap-2">
            {selectedFile.type.startsWith('image/') ? (
              <Image className="h-4 w-4 text-blue-500" />
            ) : (
              <FileText className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm truncate flex-1">{selectedFile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.pdf"
            className="hidden"
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploading}
            title="Anexar arquivo (imagem/PDF)"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending}
            className="flex-1"
          />
          
          <Button 
            onClick={handleSend} 
            disabled={sending || (!newMessage.trim() && !selectedFile)}
          >
            {sending ? (
              uploading ? 'Enviando...' : 'Enviando...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Enviar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
