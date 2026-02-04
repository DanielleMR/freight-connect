import { cn } from "@/lib/utils";

interface SummaryItem {
  label: string;
  value: number;
  color: string;
}

interface DashboardSummaryProps {
  title: string;
  items: SummaryItem[];
  total?: number;
  className?: string;
}

/**
 * DashboardSummary - Compact summary panel for secondary metrics
 * Used for completion rates, status breakdowns, etc.
 * Prepares structure for future SLA/risk indicators
 */
export function DashboardSummary({
  title,
  items,
  total,
  className,
}: DashboardSummaryProps) {
  const completionRate = total && total > 0 
    ? Math.round((items.find(i => i.label === 'Concluídos')?.value || 0) / total * 100)
    : 0;

  return (
    <div className={cn("p-5 rounded-xl border border-border bg-card", className)}>
      <h3 className="text-sm font-semibold text-foreground mb-4">
        {title}
      </h3>

      {/* Progress bar */}
      {total !== undefined && total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Taxa de conclusão</span>
            <span className="font-semibold text-foreground">{completionRate}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", item.color)} />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
            <span className="font-medium tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Audit hook placeholder - hidden, for future use */}
      <div className="hidden" data-audit-hook="summary-metrics" />
    </div>
  );
}
