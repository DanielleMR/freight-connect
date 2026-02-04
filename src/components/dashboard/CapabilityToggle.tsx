import { cn } from "@/lib/utils";
import { Truck, Wheat, Building2 } from "lucide-react";
import { UserCapability } from "@/hooks/useUserCapabilities";

interface CapabilityToggleProps {
  activeCapability: UserCapability;
  capabilities: UserCapability[];
  onCapabilityChange: (cap: UserCapability) => void;
}

const capabilityConfig: Record<UserCapability, { icon: typeof Truck; label: string }> = {
  producer: {
    icon: Wheat,
    label: 'Produtor',
  },
  driver: {
    icon: Truck,
    label: 'Motorista',
  },
  company_admin: {
    icon: Building2,
    label: 'Empresa',
  },
};

/**
 * CapabilityToggle - Simple toggle for switching between capabilities
 * Changes data and metrics, not the layout
 * Designed to be minimal and non-intrusive
 */
export function CapabilityToggle({
  activeCapability,
  capabilities,
  onCapabilityChange,
}: CapabilityToggleProps) {
  if (capabilities.length <= 1) return null;

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      {capabilities.map((cap) => {
        const config = capabilityConfig[cap];
        const Icon = config.icon;
        const isActive = cap === activeCapability;
        
        return (
          <button
            key={cap}
            onClick={() => onCapabilityChange(cap)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
              isActive 
                ? "bg-card shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>Ver como {config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
