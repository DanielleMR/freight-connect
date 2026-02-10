import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from '@/components/ui/status-badge';
import { StarRating } from '@/components/ui/star-rating';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, MapPin, Phone, MessageCircle, Star, DollarSign, Truck, FileText, CheckCircle, Filter } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { FreteTimeline } from '@/components/frete/FreteTimeline';

type FreteStatus = Database['public']['Enums']['frete_status'];

interface Frete {
  id: string;
  public_id: string;
  status: FreteStatus;
  origem: string | null;
  destino: string | null;
  quantidade_animais: number | null;
  descricao: string | null;
  tipo_animal: string | null;
  valor_frete: number | null;
  valor_contraproposta: number | null;
  tipo_cobranca: string | null;
  distancia_estimada: number | null;
  data_prevista: string | null;
  created_at: string;
  produtor_id: string;
  contrato_aceito: boolean | null;
  transportadores: {
    id: string;
    public_id: string;
    nome: string;
    telefone: string;
    whatsapp: string | null;
  } | null;
}

export default function Fretes() {
  const [fretes, setFretes] = useState<Frete[]>([]);
  const [loading, setLoading] = useState(true);
  const [produtorId, setProdutorId] = useState<string | null>(null);
  const [avaliacaoDialog, setAvaliacaoDialog] = useState<string | null>(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [submittingAvaliacao, setSubmittingAvaliacao] = useState(false);
  const [avaliacoesExistentes, setAvaliacoesExistentes] = useState<Set<string>>(new Set());
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtroStatus, setFiltroStatus] = useState<string>(searchParams.get('status') || 'todos');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchFretes();
  }, []);

  const fetchFretes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    // Buscar produtor_id
    const { data: produtorData } = await supabase
      .from('produtores')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (produtorData) {
      setProdutorId(produtorData.id);
    }

    const { data, error } = await supabase
      .from('fretes')
      .select('*, transportadores(id, public_id, nome, telefone, whatsapp)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fretes:', error);
    } else {
      setFretes(data || []);
      
      // Buscar avaliações existentes
      if (produtorData) {
        const { data: avaliacoes } = await supabase
          .from('avaliacoes')
          .select('frete_id')
          .eq('produtor_id', produtorData.id);
        
        if (avaliacoes) {
          setAvaliacoesExistentes(new Set(avaliacoes.map(a => a.frete_id)));
        }
      }
    }
    setLoading(false);
  };

  const handleEnviarAvaliacao = async (freteId: string) => {
    const frete = fretes.find(f => f.id === freteId);
    if (!frete || !produtorId || !frete.transportadores) return;

    setSubmittingAvaliacao(true);
    
    const { error } = await supabase
      .from('avaliacoes')
      .insert({
        frete_id: freteId,
        produtor_id: produtorId,
        transportador_id: frete.transportadores.id,
        nota,
        comentario: comentario || null
      });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Avaliação enviada com sucesso!' });
      setAvaliacaoDialog(null);
      setNota(5);
      setComentario('');
      fetchFretes();
    }
    setSubmittingAvaliacao(false);
  };

  const formatWhatsAppLink = (phone: string | null) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/55${cleanPhone}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleFilterChange = (value: string) => {
    setFiltroStatus(value);
    if (value === 'todos') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', value);
    }
    setSearchParams(searchParams);
  };

  const fretesFiltrados = filtroStatus === 'todos'
    ? fretes
    : fretes.filter(f => f.status === filtroStatus);

  if (loading) {
    return <div className="p-4 flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/painel')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Meus Fretes</h1>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filtroStatus} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="solicitado">Aguardando</SelectItem>
              <SelectItem value="aceito">Aceito</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="recusado">Recusado</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {fretesFiltrados.length} frete(s)
          </span>
        </div>

        {fretesFiltrados.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {filtroStatus === 'todos' ? 'Nenhum frete encontrado.' : `Nenhum frete com status "${filtroStatus}".`}
              </p>
              {filtroStatus !== 'todos' && (
                <Button variant="link" className="mt-2" onClick={() => handleFilterChange('todos')}>
                  Ver todos os fretes
                </Button>
              )}
              {filtroStatus === 'todos' && (
                <Button className="mt-4" onClick={() => navigate('/mapa/transportadores')}>
                  Solicitar Novo Frete
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {fretesFiltrados.map((frete) => (
              <Card key={frete.public_id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {frete.origem} → {frete.destino}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground font-mono">{frete.public_id}</span>
                    </div>
                    <StatusBadge status={frete.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Timeline visual do frete */}
                  <FreteTimeline status={frete.status} contratoAceito={frete.contrato_aceito || false} />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {frete.tipo_animal && (
                      <div>
                        <span className="text-muted-foreground">Tipo:</span>
                        <p className="font-medium capitalize">{frete.tipo_animal}</p>
                      </div>
                    )}
                    {frete.quantidade_animais && (
                      <div>
                        <span className="text-muted-foreground">Animais:</span>
                        <p className="font-medium">{frete.quantidade_animais}</p>
                      </div>
                    )}
                    {frete.valor_frete && (
                      <div className="flex items-start gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-muted-foreground">Valor:</span>
                          <p className="font-medium">{formatCurrency(frete.valor_frete)}</p>
                        </div>
                      </div>
                    )}
                    {frete.data_prevista && (
                      <div className="flex items-start gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-muted-foreground">Data:</span>
                          <p className="font-medium">{formatDate(frete.data_prevista)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Informações adicionais de valor */}
                  {(frete.tipo_cobranca || frete.distancia_estimada || frete.valor_contraproposta) && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm bg-muted/50 p-2 rounded-md">
                      {frete.tipo_cobranca && (
                        <div>
                          <span className="text-muted-foreground">Cobrança:</span>
                          <p className="font-medium capitalize">
                            {frete.tipo_cobranca === 'valor_fechado' ? 'Valor Fechado' : 'Por Km'}
                          </p>
                        </div>
                      )}
                      {frete.distancia_estimada && (
                        <div>
                          <span className="text-muted-foreground">Distância:</span>
                          <p className="font-medium">{frete.distancia_estimada} km</p>
                        </div>
                      )}
                      {frete.valor_contraproposta && (
                        <div>
                          <span className="text-muted-foreground">Contraproposta:</span>
                          <p className="font-medium text-amber-600">{formatCurrency(frete.valor_contraproposta)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {frete.transportadores && (
                    <div className="pt-2 border-t">
                      {/* Mostrar dados completos SOMENTE se contrato aceito */}
                      {frete.contrato_aceito ? (
                        <>
                          <p className="text-sm font-medium mb-2">Transportador: {frete.transportadores.nome}</p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <a 
                              href={`tel:${frete.transportadores.telefone}`}
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {frete.transportadores.telefone}
                            </a>
                            
                            {frete.transportadores.whatsapp && (
                              <a 
                                href={formatWhatsAppLink(frete.transportadores.whatsapp) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline"
                              >
                                <MessageCircle className="h-3 w-3" />
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="mb-2">
                          <p className="text-sm font-medium mb-1">Transportador: {frete.transportadores.public_id}</p>
                          <p className="text-xs text-muted-foreground">
                            Dados de contato disponíveis após aceite do contrato
                          </p>
                        </div>
                      )}
                      
                      {/* Link para o contrato usando public_id */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate(`/contrato/${frete.public_id}`)}
                        className="gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        Ver Contrato
                        {frete.contrato_aceito && (
                          <CheckCircle className="h-3 w-3 text-green-600 ml-1" />
                        )}
                      </Button>
                    </div>
                  )}

                  {frete.descricao && (
                    <p className="text-sm text-muted-foreground">{frete.descricao}</p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Criado em: {formatDate(frete.created_at)}
                  </p>

                  {frete.status === 'concluido' && 
                   frete.produtor_id === produtorId && 
                   !avaliacoesExistentes.has(frete.id) && (
                    <Dialog open={avaliacaoDialog === frete.id} onOpenChange={(open) => setAvaliacaoDialog(open ? frete.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <Star className="h-4 w-4 mr-2" />
                          Avaliar Transportador
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Avaliar Transportador</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                              Como foi sua experiência com {frete.transportadores?.nome}?
                            </p>
                            <StarRating rating={nota} onChange={setNota} size="lg" interactive />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="comentario">Comentário (opcional)</Label>
                            <Textarea
                              id="comentario"
                              placeholder="Deixe um comentário sobre o serviço..."
                              value={comentario}
                              onChange={(e) => setComentario(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <Button 
                            onClick={() => handleEnviarAvaliacao(frete.id)} 
                            disabled={submittingAvaliacao}
                            className="w-full"
                          >
                            {submittingAvaliacao ? 'Enviando...' : 'Enviar Avaliação'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {avaliacoesExistentes.has(frete.id) && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current" />
                      Frete avaliado
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}