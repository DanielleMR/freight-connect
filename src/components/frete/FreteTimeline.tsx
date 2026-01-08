import { CheckCircle, Circle, Clock, Truck, XCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FreteTimelineProps {
  status: string;
  contratoAceito?: boolean;
  className?: string;
}

const steps = [
  { key: "solicitado", label: "Solicitado", icon: Clock },
  { key: "aceito", label: "Aceito", icon: CheckCircle },
  { key: "em_andamento", label: "Em Transporte", icon: Truck },
  { key: "concluido", label: "Concluído", icon: CheckCircle },
];

export function FreteTimeline({ status, contratoAceito, className }: FreteTimelineProps) {
  // Se recusado, mostrar linha especial
  if (status === "recusado") {
    return (
      <div className={cn("flex items-center gap-2 py-3", className)}>
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Frete Recusado</span>
        </div>
      </div>
    );
  }

  const getStepIndex = (s: string) => steps.findIndex((step) => step.key === s);
  const currentIndex = getStepIndex(status);

  return (
    <div className={cn("py-3", className)}>
      {/* Badge de Contrato Aceito */}
      {contratoAceito && (
        <div className="mb-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
            <FileText className="h-3 w-3 mr-1" />
            Contrato Aceito
          </Badge>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div className="relative flex items-center w-full">
                {/* Linha conectora à esquerda */}
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute left-0 right-1/2 h-0.5 -translate-y-1/2 top-1/2",
                      isCompleted || isCurrent ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
                
                {/* Ícone do passo */}
                <div
                  className={cn(
                    "relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-primary border-primary text-primary-foreground animate-pulse",
                    isPending && "bg-background border-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* Linha conectora à direita */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-1/2 right-0 h-0.5 -translate-y-1/2 top-1/2",
                      isCompleted ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
              
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center",
                  isCurrent && "text-primary",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}