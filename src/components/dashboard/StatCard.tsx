import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SparklineData {
  value: number;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  sparklineData?: SparklineData[];
  variant?: 'default' | 'warning' | 'success' | 'info' | 'accent';
  onClick?: () => void;
  className?: string;
}

const variantStyles = {
  default: {
    bg: 'bg-muted/50',
    iconBg: 'bg-muted',
    iconColor: 'text-foreground',
    sparkline: 'stroke-muted-foreground',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    sparkline: 'stroke-amber-500',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    sparkline: 'stroke-emerald-500',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    sparkline: 'stroke-blue-500',
  },
  accent: {
    bg: 'bg-primary/5 dark:bg-primary/10',
    iconBg: 'bg-primary/10 dark:bg-primary/20',
    iconColor: 'text-primary',
    sparkline: 'stroke-primary',
  },
};

const Sparkline = ({ data, color }: { data: SparklineData[]; color: string }) => {
  if (data.length < 2) return null;

  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;

  const width = 80;
  const height = 32;
  const padding = 2;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg 
      width={width} 
      height={height} 
      className="flex-shrink-0"
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        fill="none"
        className={cn(color, 'stroke-2')}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  sparklineData,
  variant = 'default',
  onClick,
  className 
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card 
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]",
        styles.bg,
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-2 rounded-lg", styles.iconBg)}>
                <Icon className={cn("h-4 w-4", styles.iconColor)} />
              </div>
              <span className="text-xs font-medium text-muted-foreground truncate">
                {title}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold tracking-tight">
                {value}
              </span>
              {trend && (
                <span className={cn(
                  "text-xs font-medium mb-0.5",
                  trend.isPositive ? "text-emerald-600" : "text-red-500"
                )}>
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
              )}
            </div>
          </div>
          {sparklineData && sparklineData.length > 1 && (
            <Sparkline data={sparklineData} color={styles.sparkline} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
