import { AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AvisoBloqueioProps {
  titulo?: string;
  mensagem?: string;
  tipo?: 'manutencao' | 'indisponivel' | 'em_breve';
}

export function AvisoBloqueio({ 
  titulo = 'Funcionalidade Indisponível',
  mensagem = 'Esta funcionalidade está temporariamente desativada. Por favor, tente novamente mais tarde.',
  tipo = 'manutencao'
}: AvisoBloqueioProps) {
  const configs = {
    manutencao: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      iconColor: 'text-amber-500',
      titleColor: 'text-amber-700 dark:text-amber-400'
    },
    indisponivel: {
      icon: AlertTriangle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-500',
      titleColor: 'text-red-700 dark:text-red-400'
    },
    em_breve: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-700 dark:text-blue-400'
    }
  };

  const config = configs[tipo];
  const Icon = config.icon;

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${config.titleColor}`}>
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{mensagem}</p>
      </CardContent>
    </Card>
  );
}
