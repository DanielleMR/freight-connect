import { ShieldBan } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SuspensionBannerProps {
  motivo: string | null;
  suspendedAt: string | null;
}

export function SuspensionBanner({ motivo, suspendedAt }: SuspensionBannerProps) {
  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5 mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-destructive/20">
          <ShieldBan className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-destructive text-sm">
            Conta Suspensa
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sua conta está suspensa e você não pode criar, aceitar ou interagir com fretes.
          </p>
          {motivo && (
            <div className="mt-3 bg-background/50 rounded-lg p-3 text-sm">
              <span className="text-muted-foreground font-medium">Motivo: </span>
              <span className="text-foreground">{motivo}</span>
            </div>
          )}
          {suspendedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              Suspenso em: {format(new Date(suspendedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Entre em contato com o suporte para mais informações.
          </p>
        </div>
      </div>
    </div>
  );
}
