import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Transportador {
  id: string;
  nome: string;
  telefone: string;
  placa_veiculo: string | null;
  capacidade_animais: number | null;
}

export default function Transportadores() {
  const [transportadores, setTransportadores] = useState<Transportador[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTransportadores();
  }, []);

  const fetchTransportadores = async () => {
    const { data, error } = await supabase
      .from('transportadores')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transportadores:', error);
    } else {
      setTransportadores(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transportadores</h1>
        <Button variant="outline" onClick={() => navigate('/')}>
          Voltar
        </Button>
      </div>

      {transportadores.length === 0 ? (
        <p className="text-muted-foreground">Nenhum transportador cadastrado.</p>
      ) : (
        <div className="grid gap-4">
          {transportadores.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle>{t.nome}</CardTitle>
              </CardHeader>
              <CardContent>
                <p><strong>Telefone:</strong> {t.telefone}</p>
                {t.placa_veiculo && <p><strong>Placa:</strong> {t.placa_veiculo}</p>}
                {t.capacidade_animais && (
                  <p><strong>Capacidade:</strong> {t.capacidade_animais} animais</p>
                )}
                <Button
                  className="mt-4"
                  onClick={() => navigate(`/solicitar-frete/${t.id}`)}
                >
                  Solicitar Frete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
