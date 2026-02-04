import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";
import { ChevronRight, MapPin } from "lucide-react";

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

interface ActivityTimelineProps {
  items: ActivityItem[];
  onItemClick: (item: ActivityItem) => void;
  onViewAllClick: () => void;
  emptyMessage?: string;
  className?: string;
}

/**
 * ActivityTimeline - Chronological list of freight events
 * Information-focused, clickable for detail access
 * Supports future audit/traceability requirements
 */
export function ActivityTimeline({
  items,
  onItemClick,
  onViewAllClick,
  emptyMessage = "Nenhuma atividade recente",
  className,
}: ActivityTimelineProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Histórico Recente
        </h3>
        <button 
          onClick={onViewAllClick}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Ver histórico completo
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground bg-muted/30 rounded-lg">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => onItemClick(item)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-lg border border-transparent text-left transition-all",
                "hover:border-border hover:bg-accent/50 group"
              )}
            >
              {/* Timeline indicator */}
              <div className="flex flex-col items-center self-stretch">
                <div className="w-2 h-2 rounded-full bg-primary/60" />
                {index < items.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-sm truncate">
                    {item.origin || 'Origem'} → {item.destination || 'Destino'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {formatDistanceToNow(new Date(item.createdAt), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                  {item.animalType && item.quantity && (
                    <>
                      <span>•</span>
                      <span className="capitalize">
                        {item.quantity} {item.animalType}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <StatusBadge status={item.status} />
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
