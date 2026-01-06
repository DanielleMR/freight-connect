import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, MapPin, Calendar, Truck, Ruler } from "lucide-react";

interface FreteResumoProps {
  origem: string;
  destino: string;
  tipoAnimal: string;
  quantidade: number;
  valorFrete: number;
  tipoCobranca: string;
  distanciaEstimada?: number;
  dataPrevista: string;
  observacoesValor?: string;
  transportadorNome?: string;
}

export function FreteResumo({
  origem,
  destino,
  tipoAnimal,
  quantidade,
  valorFrete,
  tipoCobranca,
  distanciaEstimada,
  dataPrevista,
  observacoesValor,
  transportadorNome,
}: FreteResumoProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getTipoCobrancaLabel = (tipo: string) => {
    switch (tipo) {
      case "valor_fechado":
        return "Valor Fechado";
      case "valor_km":
        return "Valor por KM";
      default:
        return tipo;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Resumo do Frete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rota */}
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Rota</p>
            <p className="font-medium">
              {origem} → {destino}
            </p>
          </div>
        </div>

        {/* Tipo Animal e Quantidade */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Tipo de Animal</p>
            <p className="font-medium capitalize">{tipoAnimal}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Quantidade</p>
            <p className="font-medium">{quantidade} animais</p>
          </div>
        </div>

        {/* Valor */}
        <div className="bg-background rounded-lg p-3 border">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-600 text-lg">
              {formatCurrency(valorFrete)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Tipo: {getTipoCobrancaLabel(tipoCobranca)}
          </p>
          {distanciaEstimada && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Ruler className="h-3 w-3" />
              <span>Distância estimada: {distanciaEstimada} km</span>
            </div>
          )}
        </div>

        {/* Data */}
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Data Prevista</p>
            <p className="font-medium">{formatDate(dataPrevista)}</p>
          </div>
        </div>

        {/* Transportador */}
        {transportadorNome && (
          <div>
            <p className="text-sm text-muted-foreground">Transportador</p>
            <p className="font-medium">{transportadorNome}</p>
          </div>
        )}

        {/* Observações */}
        {observacoesValor && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-1">Observações do Valor</p>
            <p className="text-sm">{observacoesValor}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}