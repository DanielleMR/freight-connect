import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Frete {
  id: string;
  status: string;
  origem: string | null;
  destino: string | null;
  quantidade_animais: number | null;
  descricao: string | null;
  created_at: string;
  transportadores: {
    id: string;
    nome: string;
    telefone: string;
  } | null;
}

export default function Fretes() {
  const [fretes, setFretes] = useState<Frete[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchFretes();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setUserRole(data?.role || null);
    }
  };

  const fetchFretes = async () => {
    const { data, error } = await supabase
      .from('fretes')
      .select('*, transportadores(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fretes:', error);
    } else {
      setFretes(data || []);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (freteId: string, action: 'aceitar' | 'recusar') => {
    const newStatus = action === 'aceitar' ? 'aceito' : 'recusado';
    
    const { error } = await supabase
      .from('fretes')
      .update({ status: newStatus })
      .eq('id', freteId);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Frete ${action === 'aceitar' ? 'aceito' : 'recusado'}!` });
      fetchFretes();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'solicitado': return 'bg-yellow-500';
      case 'aceito': return 'bg-green-500';
      case 'recusado': return 'bg-red-500';
      case 'em_andamento': return 'bg-blue-500';
      case 'concluido': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Meus Fretes</h1>
        <Button variant="outline" onClick={() => navigate('/')}>
          Voltar
        </Button>
      </div>

      {fretes.length === 0 ? (
        <p className="text-muted-foreground">Nenhum frete encontrado.</p>
      ) : (
        <div className="grid gap-4">
          {fretes.map((frete) => (
            <Card key={frete.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    {frete.origem} → {frete.destino}
                  </CardTitle>
                  <Badge className={getStatusColor(frete.status)}>
                    {frete.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {frete.transportadores && (
                  <p><strong>Transportador:</strong> {frete.transportadores.nome}</p>
                )}
                {frete.quantidade_animais && (
                  <p><strong>Animais:</strong> {frete.quantidade_animais}</p>
                )}
                {frete.descricao && (
                  <p><strong>Descrição:</strong> {frete.descricao}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Criado em: {new Date(frete.created_at).toLocaleDateString('pt-BR')}
                </p>

                {userRole === 'transportador' && frete.status === 'solicitado' && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="default"
                      onClick={() => handleUpdateStatus(frete.id, 'aceitar')}
                    >
                      Aceitar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleUpdateStatus(frete.id, 'recusar')}
                    >
                      Recusar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
