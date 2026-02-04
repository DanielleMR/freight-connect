import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
}

/**
 * MetricCard - Large, clickable metric display
 * Core component for the dashboard's information-first approach
 * Designed for 70% information / 30% action ratio
 */
export function MetricCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  onClick,
  className 
}: MetricCardProps) {
  return (
    <button 
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group relative flex flex-col items-start p-6 rounded-xl border border-border bg-card text-left transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/30 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5",
        !onClick && "cursor-default",
        className
      )}
    >
      {/* Icon - Subtle, top-right */}
      <div className="absolute top-4 right-4 p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors">
        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      
      {/* Label */}
      <span className="text-sm font-medium text-muted-foreground mb-2">
        {title}
      </span>
      
      {/* Value - Large and prominent */}
      <span className="text-4xl font-bold tracking-tight text-foreground">
        {value}
      </span>
      
      {/* Subtitle */}
      {subtitle && (
        <span className="text-xs text-muted-foreground mt-1">
          {subtitle}
        </span>
      )}
      
      {/* Click indicator */}
      {onClick && (
        <span className="absolute bottom-3 right-3 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          Ver detalhes →
        </span>
      )}
    </button>
  );
}
