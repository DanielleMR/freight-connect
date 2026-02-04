import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type FreteStatus = Database['public']['Enums']['frete_status'];

interface ActivityItem {
  id: string;
  publicId: string;
  origin: string | null;
  destination: string | null;
  status: FreteStatus;
  createdAt: string;
  animalType?: string | null;
  quantity?: number | null;
}

interface RecentActivityListProps {
  title: string;
  items: ActivityItem[];
  onItemClick: (item: ActivityItem) => void;
  onViewAllClick: () => void;
  emptyMessage?: string;
}

export function RecentActivityList({
  title,
  items,
  onItemClick,
  onViewAllClick,
  emptyMessage = "Nenhuma atividade recente",
}: RecentActivityListProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewAllClick} className="gap-1">
            Ver todos
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => onItemClick(item)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {item.origin || 'Origem'} → {item.destination || 'Destino'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                    {item.animalType && (
                      <span className="text-xs text-muted-foreground capitalize">
                        • {item.quantity} {item.animalType}
                      </span>
                    )}
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
