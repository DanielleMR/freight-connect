import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ArrowLeft, Shield, Key, Clock, Monitor, MapPin, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SecurityEvent {
  id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

export default function SegurancaConta() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (user) fetchSecurityEvents();
  }, [user]);

  const fetchSecurityEvents = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('security_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setEvents((data || []) as SecurityEvent[]);
    setLoading(false);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login': return <Monitor className="h-4 w-4 text-primary" />;
      case 'password_change': return <Key className="h-4 w-4 text-amber-500" />;
      case 'password_reset': return <Key className="h-4 w-4 text-blue-500" />;
      case 'suspicious': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'login': return 'Login realizado';
      case 'password_change': return 'Senha alterada';
      case 'password_reset': return 'Reset de senha';
      case 'suspicious': return 'Tentativa suspeita';
      case 'failed_login': return 'Login falhou';
      default: return type;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'login': return <Badge variant="outline" className="text-emerald-600">Login</Badge>;
      case 'password_change': return <Badge className="bg-amber-500">Senha</Badge>;
      case 'suspicious': return <Badge variant="destructive">Suspeito</Badge>;
      case 'failed_login': return <Badge variant="destructive">Falha</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const parseUserAgent = (ua: string | null): string => {
    if (!ua) return 'Desconhecido';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Navegador';
  };

  const lastLogin = events.find(e => e.event_type === 'login');

  return (
    <>
      <Helmet>
        <title>Segurança da Conta | FreteBoi</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Segurança da Conta
              </h1>
              <p className="text-sm text-muted-foreground">Monitore a atividade da sua conta</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
          {/* Account Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Visão Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="text-sm font-medium truncate">{user?.email || '—'}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Último Login</p>
                  <p className="text-sm font-medium">
                    {lastLogin
                      ? format(new Date(lastLogin.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : '—'}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Dispositivo</p>
                  <p className="text-sm font-medium">
                    {lastLogin ? parseUserAgent(lastLogin.user_agent) : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status de Segurança</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Email verificado', ok: !!user?.email_confirmed_at },
                { label: 'Senha definida', ok: true },
                { label: 'Termos aceitos', ok: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">{item.label}</span>
                  {item.ok ? (
                    <Badge className="bg-emerald-500"><CheckCircle className="h-3 w-3 mr-1" />OK</Badge>
                  ) : (
                    <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Pendente</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico de Atividade
              </CardTitle>
              <CardDescription>Últimos 50 eventos de segurança da sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-4">Carregando...</p>
              ) : events.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum evento de segurança registrado.
                </p>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        {getEventIcon(event.event_type)}
                        <div>
                          <p className="text-sm font-medium">{getEventLabel(event.event_type)}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {event.ip_address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.ip_address}
                              </span>
                            )}
                            <span>
                              {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                      {getEventBadge(event.event_type)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!user?.email) return;
                  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) {
                    toast.error('Erro ao enviar email de redefinição');
                  } else {
                    toast.success('Email de redefinição de senha enviado!');
                  }
                }}
              >
                <Key className="h-4 w-4 mr-2" />
                Enviar email de redefinição de senha
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
