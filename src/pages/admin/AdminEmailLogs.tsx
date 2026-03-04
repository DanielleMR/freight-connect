import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mail, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Helmet } from 'react-helmet-async';

interface EmailLog {
  id: string;
  user_id: string | null;
  email_type: string;
  subject: string;
  recipient: string;
  status: string;
  resend_id: string | null;
  error_message: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  documento_aprovado: 'Doc. Aprovado',
  documento_rejeitado: 'Doc. Rejeitado',
  divergencia_detectada: 'Divergência',
  frete_aceito: 'Frete Aceito',
  pagamento_confirmado: 'Pagamento',
  disputa_aberta: 'Disputa',
  suspensao_aplicada: 'Suspensão',
};

export default function AdminEmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) toast.error(error.message);
    setLogs((data || []) as EmailLog[]);
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    if (filterType !== 'all' && l.email_type !== filterType) return false;
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (search && !l.recipient.toLowerCase().includes(search.toLowerCase()) && !l.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <Helmet><title>Histórico de Emails | Admin</title></Helmet>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Histórico de Emails</CardTitle>
              <CardDescription>{logs.length} emails registrados</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-48" />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-28"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p>Carregando...</p> : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum email encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(log => (
                    <TableRow key={log.id}>
                      <TableCell><Badge variant="outline">{TYPE_LABELS[log.email_type] || log.email_type}</Badge></TableCell>
                      <TableCell className="text-sm">{log.recipient}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{log.subject}</TableCell>
                      <TableCell>
                        {log.status === 'sent' ? (
                          <Badge className="bg-emerald-500">Enviado</Badge>
                        ) : log.status === 'failed' ? (
                          <Badge variant="destructive">Falhou</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
