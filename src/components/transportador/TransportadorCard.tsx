import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin } from "lucide-react";

interface Transportador {
  id: string;
  nome: string;
  tipo_animal: string | null;
  regiao_atendimento: string | null;
  capacidade_animais: number | null;
  tipo_caminhao: string | null;
  ativo: boolean;
}

interface TransportadorCardProps {
  transportador: Transportador;
  onSelect: () => void;
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

const TransportadorCard = ({ transportador: t, onSelect }: TransportadorCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              t.ativo ? "bg-primary/10" : "bg-muted"
            }`}>
              <Truck className={`h-5 w-5 ${t.ativo ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h3 className="font-semibold">{t.nome}</h3>
              <Badge variant={t.ativo ? "secondary" : "outline"} className="text-xs">
                {t.ativo ? "Disponível" : "Indisponível"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
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
                {tiposCaminhao[t.tipo_caminhao] || t.tipo_caminhao}
              </Badge>
            )}
            {t.tipo_animal && (
              <Badge variant="outline" className="text-xs">
                {tiposAnimal[t.tipo_animal] || t.tipo_animal}
              </Badge>
            )}
          </div>
        </div>

        <Button 
          className="w-full mt-4" 
          size="sm"
          onClick={onSelect}
          disabled={!t.ativo}
        >
          Solicitar Frete
        </Button>
      </CardContent>
    </Card>
  );
};

export default TransportadorCard;
