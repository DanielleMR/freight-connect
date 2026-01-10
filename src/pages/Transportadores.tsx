import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Truck, MapPin, ArrowLeft } from 'lucide-react';

interface TransportadorDirectory {
  id: string;
  public_id: string;
  nome: string;
  tipo_animal: string | null;
  regiao_atendimento: string | null;
  capacidade_animais: number | null;
  tipo_caminhao: string | null;
  ativo: boolean;
  latitude: number | null;
  longitude: number | null;
}

export default function Transportadores() {
  const [transportadores, setTransportadores] = useState<TransportadorDirectory[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTransportadores();
  }, []);

  const fetchTransportadores = async () => {
    // Usa a função segura que retorna apenas dados públicos
    const { data, error } = await supabase
      .rpc('get_transportadores_directory');

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
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 shadow">
        <div className="container mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Transportadores Disponíveis</h1>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">
            {transportadores.length} transportador(es) disponível(is)
          </p>
          <Button variant="outline" onClick={() => navigate('/mapa-transportadores')}>
            <MapPin className="h-4 w-4 mr-2" />
            Ver no Mapa
          </Button>
        </div>

        {transportadores.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum transportador disponível no momento.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transportadores.map((t) => (
              <Card key={t.public_id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{t.nome}</CardTitle>
                        <span className="text-xs text-muted-foreground font-mono">{t.public_id}</span>
                      </div>
                    </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    {t.regiao_atendimento && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{t.regiao_atendimento}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1">
                      {t.capacidade_animais && (
                        <Badge variant="outline" className="text-xs">
                          {t.capacidade_animais} animais
                        </Badge>
                      )}
                      {t.tipo_caminhao && (
                        <Badge variant="outline" className="text-xs">
                          {t.tipo_caminhao}
                        </Badge>
                      )}
                      {t.tipo_animal && (
                        <Badge variant="outline" className="text-xs">
                          {t.tipo_animal}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/solicitar-frete/${t.public_id}`)}
                  >
                    Solicitar Frete
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
