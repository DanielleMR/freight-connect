import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Phone, Truck, Filter } from "lucide-react";
import { toast } from "sonner";

interface Transportador {
  id: string;
  nome: string;
  telefone: string;
  regiao_atendimento: string | null;
  capacidade_animais: number | null;
  tipo_caminhao: string | null;
  tipo_animal: string | null;
  ativo: boolean;
}

const tiposCaminhao = [
  { value: "truck", label: "Truck" },
  { value: "carreta", label: "Carreta" },
  { value: "bitruck", label: "Bitruck" },
  { value: "romeu_julieta", label: "Romeu e Julieta" }
];

const tiposAnimal = [
  { value: "bovino", label: "Bovino" },
  { value: "suino", label: "Suíno" },
  { value: "equino", label: "Equino" },
  { value: "ovino", label: "Ovino" },
  { value: "caprino", label: "Caprino" }
];

const MapaTransportadores = () => {
  const navigate = useNavigate();
  const [transportadores, setTransportadores] = useState<Transportador[]>([]);
  const [filteredTransportadores, setFilteredTransportadores] = useState<Transportador[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    regiao: "",
    tipoAnimal: "",
    capacidadeMinima: "",
    tipoCaminhao: ""
  });

  useEffect(() => {
    const fetchTransportadores = async () => {
      try {
        const { data, error } = await supabase
          .from("transportadores")
          .select("*")
          .eq("ativo", true);

        if (error) throw error;
        setTransportadores(data || []);
        setFilteredTransportadores(data || []);
      } catch (error: any) {
        toast.error("Erro ao carregar transportadores");
      } finally {
        setLoading(false);
      }
    };

    fetchTransportadores();
  }, []);

  useEffect(() => {
    let result = [...transportadores];

    if (filters.regiao) {
      result = result.filter(t => 
        t.regiao_atendimento?.toLowerCase().includes(filters.regiao.toLowerCase())
      );
    }

    if (filters.tipoAnimal) {
      result = result.filter(t => t.tipo_animal === filters.tipoAnimal);
    }

    if (filters.capacidadeMinima) {
      const minCap = parseInt(filters.capacidadeMinima);
      result = result.filter(t => (t.capacidade_animais || 0) >= minCap);
    }

    if (filters.tipoCaminhao) {
      result = result.filter(t => t.tipo_caminhao === filters.tipoCaminhao);
    }

    setFilteredTransportadores(result);
  }, [filters, transportadores]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      regiao: "",
      tipoAnimal: "",
      capacidadeMinima: "",
      tipoCaminhao: ""
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 shadow">
        <div className="container mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Mapa de Transportadores</h1>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {/* Filtros */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Região</Label>
                  <Input
                    placeholder="Ex: São Paulo, MG..."
                    value={filters.regiao}
                    onChange={(e) => handleFilterChange("regiao", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Animal</Label>
                  <Select value={filters.tipoAnimal} onValueChange={(v) => handleFilterChange("tipoAnimal", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {tiposAnimal.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Capacidade Mínima</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 10"
                    value={filters.capacidadeMinima}
                    onChange={(e) => handleFilterChange("capacidadeMinima", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Caminhão</Label>
                  <Select value={filters.tipoCaminhao} onValueChange={(v) => handleFilterChange("tipoCaminhao", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {tiposCaminhao.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Mapa visual simples (lista estilizada como cards de mapa) */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredTransportadores.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-8">
              Nenhum transportador encontrado com os filtros selecionados.
            </p>
          ) : (
            filteredTransportadores.map((t) => (
              <Card key={t.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{t.nome}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {t.ativo ? "Disponível" : "Indisponível"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span>{t.telefone}</span>
                    </div>
                    
                    {t.regiao_atendimento && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{t.regiao_atendimento}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.capacidade_animais && (
                        <Badge variant="outline" className="text-xs">
                          {t.capacidade_animais} animais
                        </Badge>
                      )}
                      {t.tipo_caminhao && (
                        <Badge variant="outline" className="text-xs">
                          {tiposCaminhao.find(tc => tc.value === t.tipo_caminhao)?.label || t.tipo_caminhao}
                        </Badge>
                      )}
                      {t.tipo_animal && (
                        <Badge variant="outline" className="text-xs">
                          {tiposAnimal.find(ta => ta.value === t.tipo_animal)?.label || t.tipo_animal}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-4" 
                    size="sm"
                    onClick={() => navigate(`/solicitar-frete/${t.id}`)}
                  >
                    Solicitar Frete
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {filteredTransportadores.length} transportador(es) encontrado(s)
        </div>
      </main>
    </div>
  );
};

export default MapaTransportadores;
