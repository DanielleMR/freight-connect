import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Transportador {
  id: string;
  nome: string;
  telefone: string;
}

export default function SolicitarFrete() {
  const { transportadorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [transportador, setTransportador] = useState<Transportador | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (transportadorId) {
      fetchTransportador();
    }
  }, [transportadorId]);

  const fetchTransportador = async () => {
    const { data, error } = await supabase
      .from('transportadores')
      .select('id, nome, telefone')
      .eq('id', transportadorId)
      .single();

    if (error) {
      console.error('Error fetching transportador:', error);
      toast({ title: 'Erro', description: 'Transportador não encontrado', variant: 'destructive' });
      navigate('/transportadores');
    } else {
      setTransportador(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('fretes')
      .insert({
        produtor_id: user.id,
        transportador_id: transportadorId!,
        origem,
        destino,
        quantidade_animais: parseInt(quantidade) || null,
        descricao,
      });

    if (error) {
      console.error('Error creating frete:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Frete solicitado com sucesso!' });
      navigate('/fretes');
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Solicitar Frete</CardTitle>
          {transportador && (
            <p className="text-muted-foreground">
              Transportador: {transportador.nome}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="origem">Origem</Label>
              <Input
                id="origem"
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destino">Destino</Label>
              <Input
                id="destino"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade de Animais</Label>
              <Input
                id="quantidade"
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enviando...' : 'Solicitar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
