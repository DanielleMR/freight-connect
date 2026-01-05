import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, DollarSign, Truck, AlertTriangle, UserPlus } from 'lucide-react';

interface Transportador {
  id: string;
  nome: string;
  telefone: string;
  capacidade_animais: number | null;
  tipo_animal: string | null;
}

const tiposAnimal = [
  { value: "bovino", label: "Bovino" },
  { value: "suino", label: "Suíno" },
  { value: "equino", label: "Equino" },
  { value: "ovino", label: "Ovino" },
  { value: "caprino", label: "Caprino" }
];

export default function SolicitarFrete() {
  const { transportadorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [transportador, setTransportador] = useState<Transportador | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showNoCadastroModal, setShowNoCadastroModal] = useState(false);
  
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorFrete, setValorFrete] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');
  const [tipoAnimal, setTipoAnimal] = useState('');

  useEffect(() => {
    if (transportadorId) {
      fetchTransportador();
    }
  }, [transportadorId]);

  const fetchTransportador = async () => {
    const { data, error } = await supabase
      .from('transportadores')
      .select('id, nome, telefone, capacidade_animais, tipo_animal')
      .eq('id', transportadorId)
      .single();

    if (error) {
      console.error('Error fetching transportador:', error);
      toast({ title: 'Erro', description: 'Transportador não encontrado', variant: 'destructive' });
      navigate('/transportadores');
    } else {
      setTransportador(data);
      if (data.tipo_animal) {
        setTipoAnimal(data.tipo_animal);
      }
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tipoAnimal) {
      toast({ title: 'Erro', description: 'Selecione o tipo de animal', variant: 'destructive' });
      return;
    }
    
    if (!dataPrevista) {
      toast({ title: 'Erro', description: 'Informe a data prevista do transporte', variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Atenção', description: 'Você precisa estar logado para solicitar um frete', variant: 'destructive' });
      navigate('/auth');
      setSubmitting(false);
      return;
    }

    const { data: produtorData, error: produtorError } = await supabase
      .from('produtores')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (produtorError || !produtorData) {
      // Show modal or redirect to complete profile
      setShowNoCadastroModal(true);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('fretes')
      .insert({
        produtor_id: produtorData.id,
        transportador_id: transportadorId!,
        origem,
        destino,
        quantidade_animais: parseInt(quantidade) || null,
        descricao,
        valor_frete: parseFloat(valorFrete) || null,
        data_prevista: dataPrevista || null,
        tipo_animal: tipoAnimal
      });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Frete solicitado com sucesso!' });
      navigate('/produtor/painel');
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="p-4 flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Solicitar Frete
            </CardTitle>
            {transportador && (
              <div className="text-sm text-muted-foreground">
                <p><strong>Transportador:</strong> {transportador.nome}</p>
                {transportador.capacidade_animais && (
                  <p><strong>Capacidade:</strong> até {transportador.capacidade_animais} animais</p>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origem">Origem *</Label>
                  <Input
                    id="origem"
                    placeholder="Cidade/Estado de origem"
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destino">Destino *</Label>
                  <Input
                    id="destino"
                    placeholder="Cidade/Estado de destino"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoAnimal">Tipo de Animal *</Label>
                <Select value={tipoAnimal} onValueChange={setTipoAnimal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de animal" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposAnimal.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade de Animais *</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    placeholder="Ex: 20"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorFrete" className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Valor do Frete (R$)
                  </Label>
                  <Input
                    id="valorFrete"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 1500.00"
                    value={valorFrete}
                    onChange={(e) => setValorFrete(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataPrevista" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data Prevista *
                </Label>
                <Input
                  id="dataPrevista"
                  type="date"
                  value={dataPrevista}
                  onChange={(e) => setDataPrevista(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Observações</Label>
                <Textarea
                  id="descricao"
                  placeholder="Informações adicionais sobre o frete..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Enviando...' : 'Solicitar Frete'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Modal para usuários sem cadastro de produtor */}
        <Dialog open={showNoCadastroModal} onOpenChange={setShowNoCadastroModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <DialogTitle className="text-center">Cadastro de Produtor Necessário</DialogTitle>
              <DialogDescription className="text-center">
                Para solicitar fretes, você precisa ter um cadastro de produtor completo em sua conta.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground text-center">
                Complete seu cadastro para poder solicitar transporte de animais aos transportadores disponíveis.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate('/produtor/cadastro')} className="w-full gap-2">
                  <UserPlus className="h-4 w-4" />
                  Completar Cadastro de Produtor
                </Button>
                <Button variant="outline" onClick={() => setShowNoCadastroModal(false)} className="w-full">
                  Voltar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}