import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  lida: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchNotificacoes(user.id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notificacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotificacoes(prev => [payload.new as Notificacao, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchNotificacoes = async (uid: string) => {
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setNotificacoes(data);
  };

  const marcarComoLida = async (id: string) => {
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id);

    setNotificacoes(prev =>
      prev.map(n => n.id === id ? { ...n, lida: true } : n)
    );
  };

  const marcarTodasComoLidas = async () => {
    if (!userId) return;
    
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('user_id', userId)
      .eq('lida', false);

    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'novo_frete': return '🚚';
      case 'status_frete': return '📦';
      default: return '🔔';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive"
            >
              {naoLidas > 9 ? '9+' : naoLidas}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notificações</h4>
          {naoLidas > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={marcarTodasComoLidas}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notificacoes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y">
              {notificacoes.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${!n.lida ? 'bg-primary/5' : ''}`}
                  onClick={() => marcarComoLida(n.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getTipoIcon(n.tipo)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.lida ? 'font-semibold' : ''}`}>
                        {n.titulo}
                      </p>
                      {n.mensagem && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.mensagem}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>
                    {!n.lida && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
