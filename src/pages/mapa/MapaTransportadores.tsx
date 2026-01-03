import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Filter, List, Map } from "lucide-react";
import { toast } from "sonner";
import TransportadorMap from "@/components/map/TransportadorMap";
import TransportadorCard from "@/components/transportador/TransportadorCard";

interface TransportadorDirectory {
  id: string;
  nome: string;
  tipo_animal: string | null;
  regiao_atendimento: string | null;
  capacidade_animais: number | null;
  tipo_caminhao: string | null;
  ativo: boolean;
  latitude: number | null;
  longitude: number | null;
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
  const [transportadores, setTransportadores] = useState<TransportadorDirectory[]>([]);
  const [filteredTransportadores, setFilteredTransportadores] = useState<TransportadorDirectory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  const [filters, setFilters] = useState({
    regiao: "",
    tipoAnimal: "",
    capacidadeMinima: "",
    tipoCaminhao: "",
    apenasDisponiveis: true
  });

  useEffect(() => {
    const fetchTransportadores = async () => {
      try {
        const { data, error } = await supabase.rpc('get_transportadores_directory');
        if (error) throw error;
        setTransportadores(data || []);
        setFilteredTransportadores(data || []);
      } catch (error: any) {
        toast.error("Erro ao carregar transportadores");
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransportadores();
  }, []);

  useEffect(() => {
    let result = [...transportadores];

    if (filters.apenasDisponiveis) {
      result = result.filter(t => t.ativo);
    }

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

  const handleFilterChange = (field: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      regiao: "",
      tipoAnimal: "",
      capacidadeMinima: "",
      tipoCaminhao: "",
      apenasDisponiveis: true
    });
  };

  const handleSelectTransportador = (id: string) => {
    navigate(`/solicitar-frete/${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 shadow">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Mapa de Transportadores</h1>
          </div>
          <div className="flex items-center gap-2 bg-primary-foreground/10 rounded-lg p-1">
            <Button
              variant={viewMode === "map" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="gap-2"
            >
              <Map className="h-4 w-4" />
              Mapa
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              Lista
            </Button>
          </div>
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
              <div className="grid md:grid-cols-5 gap-4">
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

                <div className="space-y-2">
                  <Label>Disponibilidade</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={filters.apenasDisponiveis}
                      onCheckedChange={(v) => handleFilterChange("apenasDisponiveis", v)}
                    />
                    <span className="text-sm text-muted-foreground">
                      Apenas disponíveis
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
                <span className="text-sm text-muted-foreground">
                  {filteredTransportadores.length} transportador(es) encontrado(s)
                </span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Conteúdo principal */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : viewMode === "map" ? (
          <TransportadorMap
            transportadores={filteredTransportadores}
            onSelectTransportador={handleSelectTransportador}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTransportadores.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground py-8">
                Nenhum transportador encontrado com os filtros selecionados.
              </p>
            ) : (
              filteredTransportadores.map((t) => (
                <TransportadorCard
                  key={t.id}
                  transportador={t}
                  onSelect={() => handleSelectTransportador(t.id)}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default MapaTransportadores;
