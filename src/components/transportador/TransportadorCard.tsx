import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Crown } from "lucide-react";
import ReportUserButton from "@/components/reports/ReportUserButton";

interface Transportador {
  id: string;
  user_id?: string | null;
  nome: string;
  tipo_animal: string | null;
  regiao_atendimento: string | null;
  capacidade_animais: number | null;
  tipo_caminhao: string | null;
  ativo: boolean;
  destaque_mapa?: boolean;
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
    <Card className={`hover:shadow-lg transition-shadow ${t.destaque_mapa ? 'border-yellow-500 ring-1 ring-yellow-500/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              t.destaque_mapa ? "bg-yellow-100 dark:bg-yellow-900/30" : t.ativo ? "bg-primary/10" : "bg-muted"
            }`}>
              <Truck className={`h-5 w-5 ${t.destaque_mapa ? "text-yellow-600" : t.ativo ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{t.nome}</h3>
                {t.destaque_mapa && (
                  <Badge className="bg-yellow-500 text-xs gap-1">
                    <Crown className="h-3 w-3" /> PRO
                  </Badge>
                )}
              </div>
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

        <div className="flex items-center gap-2 mt-4">
          <Button 
            className="flex-1" 
            size="sm"
            onClick={onSelect}
            disabled={!t.ativo}
          >
            Solicitar Frete
          </Button>
          {t.user_id && (
            <ReportUserButton
              reportedUserId={t.user_id}
              reportedUserName={t.nome}
              size="sm"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransportadorCard;
