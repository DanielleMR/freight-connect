import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  buttonLabel: string;
  buttonVariant?: 'default' | 'outline' | 'secondary';
  onClick: () => void;
  className?: string;
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  buttonLabel,
  buttonVariant = 'default',
  onClick,
  className,
}: QuickActionCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.01] group",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {description}
        </p>
        <Button 
          variant={buttonVariant} 
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
