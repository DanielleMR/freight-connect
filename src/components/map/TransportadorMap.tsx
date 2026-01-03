import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Truck, MapPin, AlertCircle } from "lucide-react";

interface Transportador {
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

interface TransportadorMapProps {
  transportadores: Transportador[];
  onSelectTransportador?: (id: string) => void;
}

const tiposCaminhao: Record<string, string> = {
  truck: "Truck",
  carreta: "Carreta",
  bitruck: "Bitruck",
  romeu_julieta: "Romeu e Julieta",
};

const tiposAnimal: Record<string, string> = {
  bovino: "Bovino",
  suino: "Suíno",
  equino: "Equino",
  ovino: "Ovino",
  caprino: "Caprino",
};

const TransportadorMap = ({ transportadores, onSelectTransportador }: TransportadorMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState(() => {
    return localStorage.getItem("mapbox_token") || "";
  });
  const [tokenInput, setTokenInput] = useState(mapboxToken);
  const [mapInitialized, setMapInitialized] = useState(!!mapboxToken);
  const [selectedTransportador, setSelectedTransportador] = useState<Transportador | null>(null);

  const saveToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem("mapbox_token", tokenInput.trim());
      setMapboxToken(tokenInput.trim());
      setMapInitialized(true);
    }
  };

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    try {
      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-49.0, -15.0], // Centro do Brasil
        zoom: 4,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    } catch (error) {
      console.error("Error initializing Mapbox:", error);
      setMapInitialized(false);
      localStorage.removeItem("mapbox_token");
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Adicionar marcadores
  useEffect(() => {
    if (!map.current || !mapInitialized) return;

    // Limpar marcadores anteriores
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Adicionar novos marcadores
    transportadores.forEach((t) => {
      if (t.latitude && t.longitude) {
        const el = document.createElement("div");
        el.className = "mapbox-marker";
        el.innerHTML = `
          <div class="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${
            t.ativo 
              ? "bg-primary text-primary-foreground shadow-lg" 
              : "bg-muted text-muted-foreground"
          }">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 17h4V5H2v12h3"/>
              <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/>
              <circle cx="7.5" cy="17.5" r="2.5"/>
              <circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>
          </div>
        `;

        el.addEventListener("click", () => {
          setSelectedTransportador(t);
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([t.longitude, t.latitude])
          .addTo(map.current!);

        markersRef.current.push(marker);
      }
    });
  }, [transportadores, mapInitialized]);

  // Ajustar bounds para mostrar todos os marcadores
  useEffect(() => {
    if (!map.current || !mapInitialized || transportadores.length === 0) return;

    const validTransportadores = transportadores.filter(t => t.latitude && t.longitude);
    if (validTransportadores.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    validTransportadores.forEach((t) => {
      if (t.latitude && t.longitude) {
        bounds.extend([t.longitude, t.latitude]);
      }
    });

    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 10,
    });
  }, [transportadores, mapInitialized]);

  if (!mapInitialized) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Configurar Mapbox
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para visualizar o mapa interativo, insira seu token público do Mapbox.
            Você pode obter um em{" "}
            <a
              href="https://mapbox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              mapbox.com
            </a>
          </p>
          <div className="space-y-2">
            <Label htmlFor="mapbox-token">Token Público do Mapbox</Label>
            <Input
              id="mapbox-token"
              type="text"
              placeholder="pk.eyJ1..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
          </div>
          <Button onClick={saveToken} disabled={!tokenInput.trim()}>
            Salvar e Carregar Mapa
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Card do transportador selecionado */}
      {selectedTransportador && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-10 animate-scale-in">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedTransportador.ativo 
                      ? "bg-primary/10" 
                      : "bg-muted"
                  }`}>
                    <Truck className={`h-6 w-6 ${
                      selectedTransportador.ativo 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {selectedTransportador.nome}
                    </h3>
                    <span className={`text-xs font-medium ${
                      selectedTransportador.ativo 
                        ? "text-green-600" 
                        : "text-muted-foreground"
                    }`}>
                      {selectedTransportador.ativo ? "Disponível" : "Indisponível"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSelectedTransportador(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                {selectedTransportador.regiao_atendimento && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedTransportador.regiao_atendimento}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {selectedTransportador.capacidade_animais && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
                      {selectedTransportador.capacidade_animais} animais
                    </span>
                  )}
                  {selectedTransportador.tipo_caminhao && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
                      {tiposCaminhao[selectedTransportador.tipo_caminhao] || selectedTransportador.tipo_caminhao}
                    </span>
                  )}
                  {selectedTransportador.tipo_animal && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
                      {tiposAnimal[selectedTransportador.tipo_animal] || selectedTransportador.tipo_animal}
                    </span>
                  )}
                </div>
              </div>

              {onSelectTransportador && selectedTransportador.ativo && (
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => onSelectTransportador(selectedTransportador.id)}
                >
                  Solicitar Frete
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TransportadorMap;
