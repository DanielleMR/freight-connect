import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { MessageCircle, Eye, AlertTriangle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface FreteChat {
  frete_id: string;
  frete_public_id: string;
  total_messages: number;
  blocked_messages: number;
  last_message_at: string;
  origem: string | null;
  destino: string | null;
}

const AdminChats = () => {
  const [chats, setChats] = useState<FreteChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewChat, setViewChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filterBloqueadas, setFilterBloqueadas] = useState<string>('all');

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      // Buscar todas as mensagens agrupadas por frete
      const { data: mensagens, error } = await supabase
        .from('mensagens_chat')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar fretes para obter public_id
      const freteIds = [...new Set((mensagens || []).map(m => m.frete_id))];
      
      const { data: fretes } = await supabase
        .from('fretes')
        .select('id, public_id, origem, destino')
        .in('id', freteIds);

      // Agrupar por frete
      const chatMap = new Map<string, FreteChat>();
      
      (mensagens || []).forEach(msg => {
        const frete = fretes?.find(f => f.id === msg.frete_id);
        
        if (!chatMap.has(msg.frete_id)) {
          chatMap.set(msg.frete_id, {
            frete_id: msg.frete_id,
            frete_public_id: frete?.public_id || 'N/A',
            total_messages: 0,
            blocked_messages: 0,
            last_message_at: msg.created_at,
            origem: frete?.origem || null,
            destino: frete?.destino || null
          });
        }
        
        const chat = chatMap.get(msg.frete_id)!;
        chat.total_messages++;
        if (msg.bloqueada) chat.blocked_messages++;
        if (new Date(msg.created_at) > new Date(chat.last_message_at)) {
          chat.last_message_at = msg.created_at;
        }
      });

      setChats(Array.from(chatMap.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      ));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openChat = async (freteId: string) => {
    try {
      const { data, error } = await supabase
        .from('mensagens_chat')
        .select('*')
        .eq('frete_id', freteId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
      setViewChat(freteId);
    } catch (error: any) {
      toast.error(error.message);
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

  const filteredChats = filterBloqueadas === 'blocked' 
    ? chats.filter(c => c.blocked_messages > 0)
    : chats;

  const totalBloqueadas = chats.reduce((acc, c) => acc + c.blocked_messages, 0);

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Auditoria de Chats
              </CardTitle>
              <CardDescription>
                {totalBloqueadas > 0 ? (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {totalBloqueadas} mensagem(ns) bloqueada(s) por tentativa de contato externo
                  </span>
                ) : (
                  'Visualize todas as conversas dos fretes'
                )}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterBloqueadas} onValueChange={setFilterBloqueadas}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as conversas</SelectItem>
                  <SelectItem value="blocked">Com bloqueios</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : filteredChats.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma conversa encontrada.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Frete</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Total Mensagens</TableHead>
                    <TableHead>Bloqueadas</TableHead>
                    <TableHead>Última Mensagem</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChats.map((chat) => (
                    <TableRow key={chat.frete_id} className={chat.blocked_messages > 0 ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {chat.frete_public_id}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {chat.origem} → {chat.destino}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{chat.total_messages}</Badge>
                      </TableCell>
                      <TableCell>
                        {chat.blocked_messages > 0 ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            {chat.blocked_messages}
                          </Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(chat.last_message_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openChat(chat.frete_id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver Chat
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Chat Dialog */}
      <Dialog open={!!viewChat} onOpenChange={() => setViewChat(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Histórico do Chat
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.bloqueada 
                      ? 'bg-red-100 dark:bg-red-900/30 border border-red-300' 
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${getSenderColor(msg.sender_tipo)}`} />
                    <span className="text-xs font-medium">
                      {getSenderLabel(msg.sender_tipo)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                    {msg.bloqueada && (
                      <Badge variant="destructive" className="text-[10px] h-4">
                        <AlertTriangle className="h-2 w-2 mr-1" />
                        BLOQUEADA
                      </Badge>
                    )}
                  </div>
                  
                  <p className={`text-sm ${msg.bloqueada ? 'line-through text-red-600' : ''}`}>
                    {msg.conteudo}
                  </p>
                  
                  {msg.bloqueada && msg.motivo_bloqueio && (
                    <p className="text-xs text-red-500 mt-1">
                      Motivo: {msg.motivo_bloqueio}
                    </p>
                  )}
                  
                  {msg.arquivo_url && (
                    <div className="mt-2">
                      {msg.arquivo_tipo === 'image' ? (
                        <img src={msg.arquivo_url} alt="Anexo" className="max-w-xs rounded" />
                      ) : (
                        <a href={msg.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                          Ver PDF anexado
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminChats;
