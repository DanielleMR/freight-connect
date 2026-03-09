import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, CheckCircle, Clock, Eye, Ban, FileText, ExternalLink, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description: string;
  evidence_url: string | null;
  evidence_name: string | null;
  status: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface UserProfile {
  email: string | null;
  roles: string[];
  transportador?: { nome: string; public_id: string } | null;
  produtor?: { nome: string; public_id: string } | null;
}

const REASON_LABELS: Record<string, string> = {
  fraude: 'Fraude',
  comportamento_inadequado: 'Comportamento inadequado',
  dados_falsos: 'Dados falsos',
  golpe: 'Golpe',
  outro: 'Outro',
};

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  resolvido: 'Resolvido',
};

export default function AdminDenuncias() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportedProfile, setReportedProfile] = useState<UserProfile | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [suspendMotivo, setSuspendMotivo] = useState('');
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar denúncias');
    } else {
      setReports((data || []) as Report[]);
    }
    setLoading(false);
  };

  const fetchUserProfile = async (userId: string) => {
    setReportedProfile(null);

    // Get email from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    // Get roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    // Check transportador
    const { data: transp } = await supabase
      .from('transportadores')
      .select('nome, public_id')
      .eq('user_id', userId)
      .maybeSingle();

    // Check produtor
    const { data: prod } = await supabase
      .from('produtores')
      .select('nome, public_id')
      .eq('user_id', userId)
      .maybeSingle();

    setReportedProfile({
      email: profile?.email || null,
      roles: (roles || []).map(r => r.role),
      transportador: transp || null,
      produtor: prod || null,
    });
  };

  const handleViewReport = async (report: Report) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    await fetchUserProfile(report.reported_user_id);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      const updateData: any = {
        status: newStatus,
        admin_notes: adminNotes.trim() || null,
      };
      if (newStatus === 'resolvido') {
        const { data: { session } } = await supabase.auth.getSession();
        updateData.resolved_by = session?.user?.id;
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', selectedReport.id);

      if (error) throw error;
      toast.success(`Denúncia marcada como "${STATUS_LABELS[newStatus]}"`);
      setSelectedReport(null);
      fetchReports();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedReport || !suspendMotivo.trim()) {
      toast.error('Informe o motivo da suspensão.');
      return;
    }
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from('suspensoes').insert({
        user_id: selectedReport.reported_user_id,
        suspenso_por: session?.user?.id || '',
        motivo: suspendMotivo.trim(),
      });
      if (error) throw error;

      // Also mark report as resolved
      await supabase.from('reports').update({
        status: 'resolvido',
        admin_notes: `Usuário suspenso. Motivo: ${suspendMotivo.trim()}. ${adminNotes}`.trim(),
        resolved_by: session?.user?.id,
        resolved_at: new Date().toISOString(),
      }).eq('id', selectedReport.id);

      toast.success('Usuário suspenso e denúncia resolvida.');
      setShowSuspendDialog(false);
      setSuspendMotivo('');
      setSelectedReport(null);
      fetchReports();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReports = reports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        r.description.toLowerCase().includes(term) ||
        r.reason.toLowerCase().includes(term) ||
        r.reported_user_id.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolvido': return <Badge className="bg-emerald-500 text-white">Resolvido</Badge>;
      case 'em_analise': return <Badge className="bg-amber-500 text-white">Em análise</Badge>;
      default: return <Badge variant="destructive">Pendente</Badge>;
    }
  };

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      fraude: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      golpe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      dados_falsos: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      comportamento_inadequado: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      outro: 'bg-muted text-muted-foreground',
    };
    return <Badge variant="outline" className={colors[reason] || ''}>{REASON_LABELS[reason] || reason}</Badge>;
  };

  const pendingCount = reports.filter(r => r.status === 'pendente').length;

  return (
    <AdminLayout>
      <Helmet><title>Denúncias | Admin FreteBoi</title></Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Denúncias
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">{reports.length} denúncia{reports.length !== 1 ? 's' : ''} registrada{reports.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_analise">Em análise</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reports list */}
        {loading ? (
          <div className="text-center py-12"><p className="text-muted-foreground">Carregando...</p></div>
        ) : filteredReports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma denúncia encontrada.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <Card key={report.id} className={`cursor-pointer hover:shadow-md transition-shadow ${
                report.status === 'pendente' ? 'border-red-200' : report.status === 'em_analise' ? 'border-amber-200' : ''
              }`} onClick={() => handleViewReport(report)}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getReasonBadge(report.reason)}
                        {getStatusBadge(report.status)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(report.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2">{report.description}</p>
                      {report.evidence_url && (
                        <span className="text-xs text-primary flex items-center gap-1 mt-1">
                          <FileText className="h-3 w-3" /> Evidência anexada
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedReport} onOpenChange={(v) => { if (!v) setSelectedReport(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Detalhes da Denúncia
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              {/* Status & Reason */}
              <div className="flex items-center gap-2 flex-wrap">
                {getReasonBadge(selectedReport.reason)}
                {getStatusBadge(selectedReport.status)}
              </div>

              {/* Date */}
              <p className="text-sm text-muted-foreground">
                Registrada em {format(new Date(selectedReport.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>

              {/* Description */}
              <div>
                <p className="text-sm font-medium mb-1">Descrição:</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedReport.description}</p>
              </div>

              {/* Evidence */}
              {selectedReport.evidence_url && (
                <div>
                  <p className="text-sm font-medium mb-1">Evidência:</p>
                  <a href={selectedReport.evidence_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-primary underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {selectedReport.evidence_name || 'Ver evidência'}
                  </a>
                </div>
              )}

              {/* Reported user profile */}
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-1"><User className="h-4 w-4" /> Perfil do Denunciado:</p>
                {reportedProfile ? (
                  <>
                    {reportedProfile.email && <p className="text-sm">Email: {reportedProfile.email}</p>}
                    <p className="text-sm">Roles: {reportedProfile.roles.join(', ') || 'Nenhuma'}</p>
                    {reportedProfile.transportador && (
                      <p className="text-sm">Transportador: {reportedProfile.transportador.nome} ({reportedProfile.transportador.public_id})</p>
                    )}
                    {reportedProfile.produtor && (
                      <p className="text-sm">Produtor: {reportedProfile.produtor.nome} ({reportedProfile.produtor.public_id})</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Carregando perfil...</p>
                )}
              </div>

              {/* Admin notes */}
              <div>
                <p className="text-sm font-medium mb-1">Notas do admin:</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Adicione observações sobre a análise..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              {selectedReport.status !== 'resolvido' && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedReport.status === 'pendente' && (
                    <Button variant="outline" onClick={() => handleUpdateStatus('em_analise')} disabled={actionLoading}>
                      <Clock className="h-4 w-4 mr-1" /> Marcar em análise
                    </Button>
                  )}
                  <Button variant="default" onClick={() => handleUpdateStatus('resolvido')} disabled={actionLoading}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Resolver
                  </Button>
                  <Button variant="destructive" onClick={() => setShowSuspendDialog(true)} disabled={actionLoading}>
                    <Ban className="h-4 w-4 mr-1" /> Suspender conta
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Ban className="h-5 w-5" /> Suspender Conta
            </DialogTitle>
            <DialogDescription>
              Esta ação suspenderá imediatamente o acesso do usuário à plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={suspendMotivo}
              onChange={(e) => setSuspendMotivo(e.target.value)}
              placeholder="Motivo da suspensão (obrigatório)..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleSuspendUser} disabled={actionLoading || !suspendMotivo.trim()}>
              {actionLoading ? 'Suspendendo...' : 'Confirmar Suspensão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
