import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ContratoTexto, gerarTextoContrato } from '@/components/contrato/ContratoTexto';
import { ArrowLeft, FileText, CheckCircle, Clock, Shield, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FreteChat } from '@/components/chat/FreteChat';

interface Contrato {
  id: string;
  frete_id: string;
  produtor_id: string;
  transportador_id: string;
  texto_contrato: string;
  versao_contrato: string;
  status: 'pendente' | 'aceito';
  aceito_por_user_id: string | null;
  aceito_em: string | null;
  ip_aceite: string | null;
  created_at: string;
}

interface FreteData {
  id: string;
  origem: string | null;
  destino: string | null;
  tipo_animal: string | null;
  quantidade_animais: number | null;
  valor_frete: number | null;
  valor_contraproposta: number | null;
  tipo_cobranca: string | null;
  data_prevista: string | null;
  descricao: string | null;
  status: string;
  produtores: {
    id: string;
    nome: string;
    cpf_cnpj: string | null;
    telefone: string;
    cidade: string | null;
    estado: string | null;
  };
  transportadores: {
    id: string;
    nome: string;
    cpf_cnpj: string | null;
    telefone: string;
    placa_veiculo: string | null;
  };
}

export default function ContratoFrete() {
  const { fretePublicId } = useParams<{ fretePublicId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [freteData, setFreteData] = useState<FreteData | null>(null);
  const [freteId, setFreteId] = useState<string | null>(null);
  const [concordo, setConcordo] = useState(false);
  const [aceitando, setAceitando] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchContrato();
  }, [fretePublicId]);

  const fetchContrato = async () => {
    if (!fretePublicId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUserId(user.id);

    // Buscar role do usuário
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (roleData) {
      setUserRole(roleData.role);
    }

    // Buscar dados do frete pelo public_id
    const { data: frete, error: freteError } = await supabase
      .from('fretes')
      .select(`
        *,
        produtores(id, nome, cpf_cnpj, telefone, cidade, estado),
        transportadores(id, nome, cpf_cnpj, telefone, placa_veiculo)
      `)
      .eq('public_id', fretePublicId)
      .maybeSingle();

    if (freteError || !frete) {
      toast.error('Frete não encontrado');
      navigate(-1);
      return;
    }

    setFreteData(frete as unknown as FreteData);
    setFreteId(frete.id);

    // Buscar contrato existente usando o ID real do frete
    const { data: contratoData } = await supabase
      .from('contratos')
      .select('*')
      .eq('frete_id', frete.id)
      .maybeSingle();

    if (contratoData) {
      setContrato(contratoData as Contrato);
    }

    setLoading(false);
  };

  const handleAceitarContrato = async () => {
    if (!concordo || !freteData || !userId) return;

    setAceitando(true);

    try {
      // Obter IP do cliente (através de um serviço externo)
      let ipAddress = 'Não disponível';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch {
        console.log('Não foi possível obter o IP');
      }

      if (contrato) {
        // Atualizar contrato existente
        const { error } = await supabase
          .from('contratos')
          .update({
            status: 'aceito',
            aceito_por_user_id: userId,
            aceito_em: new Date().toISOString(),
            ip_aceite: ipAddress
          })
          .eq('id', contrato.id);

        if (error) throw error;
      } else {
        // Criar novo contrato
        const textoContrato = gerarTextoContrato({
          produtor: freteData.produtores,
          transportador: freteData.transportadores,
          frete: freteData
        });

        const { error } = await supabase
          .from('contratos')
          .insert({
            frete_id: freteData.id,
            produtor_id: freteData.produtores.id,
            transportador_id: freteData.transportadores.id,
            texto_contrato: textoContrato,
            versao_contrato: '1.0',
            status: 'aceito',
            aceito_por_user_id: userId,
            aceito_em: new Date().toISOString(),
            ip_aceite: ipAddress
          });

        if (error) throw error;
      }

      // Atualizar frete para indicar contrato aceito
      await supabase
        .from('fretes')
        .update({ contrato_aceito: true })
        .eq('id', freteData.id);

      toast.success('Contrato aceito com sucesso!');
      fetchContrato();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aceitar contrato');
    } finally {
      setAceitando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Carregando contrato...</p>
      </div>
    );
  }

  if (!freteData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Frete não encontrado</p>
      </div>
    );
  }

  const contratoAceito = contrato?.status === 'aceito';

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Contrato do Frete</h1>
          </div>
          <Badge variant={contratoAceito ? 'default' : 'secondary'} className="ml-auto">
            {contratoAceito ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Aceito</>
            ) : (
              <><Clock className="h-3 w-3 mr-1" /> Pendente</>
            )}
          </Badge>
        </div>

        {/* Resumo do Frete */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {freteData.origem} → {freteData.destino}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium capitalize">{freteData.tipo_animal || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Quantidade:</span>
                <p className="font-medium">{freteData.quantidade_animais || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor:</span>
                <p className="font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                    .format(freteData.valor_contraproposta || freteData.valor_frete || 0)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Data:</span>
                <p className="font-medium">
                  {freteData.data_prevista 
                    ? format(new Date(freteData.data_prevista), 'dd/MM/yyyy', { locale: ptBR }) 
                    : 'A combinar'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Texto do Contrato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Termos do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contrato ? (
              <div className="bg-muted/30 border rounded-lg p-4 md:p-6 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[60vh]">
                {contrato.texto_contrato}
              </div>
            ) : (
              <ContratoTexto
                produtor={freteData.produtores}
                transportador={freteData.transportadores}
                frete={freteData}
              />
            )}
          </CardContent>
        </Card>

        {/* Status do Aceite */}
        {contratoAceito && contrato && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Contrato Aceito Eletronicamente</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Data do aceite: {contrato.aceito_em && format(new Date(contrato.aceito_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                <p>IP registrado: {contrato.ip_aceite || 'Não registrado'}</p>
                <p>Versão do contrato: {contrato.versao_contrato}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aceite do Contrato */}
        {!contratoAceito && userRole === 'transportador' && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="concordo" 
                  checked={concordo}
                  onCheckedChange={(checked) => setConcordo(checked === true)}
                />
                <label htmlFor="concordo" className="text-sm cursor-pointer">
                  Li e concordo com todos os termos e condições do contrato acima.
                  Declaro estar ciente de minhas responsabilidades como transportador.
                </label>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleAceitarContrato}
                  disabled={!concordo || aceitando}
                  className="flex-1"
                >
                  {aceitando ? 'Processando...' : 'Aceitar Contrato e Frete'}
                </Button>
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Cancelar
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Ao aceitar, você concorda com os termos do contrato conforme a 
                Lei nº 14.063/2020 (Marco Legal das Assinaturas Eletrônicas).
              </p>
            </CardContent>
          </Card>
        )}

        {!contratoAceito && userRole !== 'transportador' && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Aguardando aceite do transportador</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat do Frete */}
        {freteId && fretePublicId && userId && userRole && (
          <FreteChat
            freteId={freteId}
            fretePublicId={fretePublicId}
            currentUserId={userId}
            currentUserType={userRole as 'produtor' | 'transportador' | 'admin'}
          />
        )}
      </div>
    </div>
  );
}
