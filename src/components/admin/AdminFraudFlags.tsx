import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FraudFlag {
  id: string;
  user_id: string;
  tipo_alerta: string;
  descricao: string;
  severidade: string;
  status: string;
  created_at: string;
}

export function AdminFraudFlags() {
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    const { data, error } = await supabase
      .from('fraud_flags')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setFlags(data as FraudFlag[]);
    }
    setLoading(false);
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.rpc('detect_fraud_indicators');
      if (error) throw error;
      toast({
        title: 'Varredura concluída',
        description: `${data} indicadores processados.`,
      });
      fetchFlags();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const dismissFlag = async (flagId: string) => {
    const { error } = await supabase
      .from('fraud_flags')
      .update({ status: 'revisado', revisado_em: new Date().toISOString() })
      .eq('id', flagId);

    if (!error) {
      setFlags(prev => prev.map(f => f.id === flagId ? { ...f, status: 'revisado' } : f));
      toast({ title: 'Alerta marcado como revisado' });
    }
  };

  const severityConfig: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
    critico: { icon: ShieldAlert, color: 'text-destructive', label: 'Crítico' },
    alto: { icon: AlertTriangle, color: 'text-orange-500', label: 'Alto' },
    medio: { icon: Shield, color: 'text-yellow-500', label: 'Médio' },
    baixo: { icon: ShieldCheck, color: 'text-muted-foreground', label: 'Baixo' },
  };

  const alertLabels: Record<string, string> = {
    telefone_duplicado: 'Telefone Duplicado',
    cpf_cnpj_duplicado: 'CPF/CNPJ Duplicado',
    criacao_massiva_fretes: 'Criação Massiva',
    alto_cancelamento: 'Alto Cancelamento',
    avaliacoes_negativas: 'Avaliações Negativas',
  };

  const pendingFlags = flags.filter(f => f.status === 'pendente');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <h3 className="font-semibold">Detecção de Fraude</h3>
          {pendingFlags.length > 0 && (
            <Badge variant="destructive">{pendingFlags.length} pendentes</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={runScan} disabled={scanning}>
          <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Varrendo...' : 'Executar Varredura'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : flags.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>Nenhum indicador de fraude detectado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {flags.map(flag => {
            const config = severityConfig[flag.severidade] || severityConfig.baixo;
            const Icon = config.icon;

            return (
              <Card key={flag.id} className={flag.status === 'revisado' ? 'opacity-50' : ''}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {alertLabels[flag.tipo_alerta] || flag.tipo_alerta}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{flag.descricao}</p>
                      <p className="text-[10px] text-muted-foreground">
                        User: {flag.user_id.slice(0, 8)}... • {new Date(flag.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  {flag.status === 'pendente' && (
                    <Button size="sm" variant="ghost" onClick={() => dismissFlag(flag.id)}>
                      Revisar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
