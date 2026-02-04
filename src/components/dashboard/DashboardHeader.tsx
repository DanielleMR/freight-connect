import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/notification-bell";
import { LogOut, Truck, Wheat, Building2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserCapability } from "@/hooks/useUserCapabilities";

interface DashboardHeaderProps {
  userName: string;
  activeCapability: UserCapability;
  capabilities: UserCapability[];
  onCapabilityChange: (cap: UserCapability) => void;
  onLogout: () => void;
  onSettings?: () => void;
}

const capabilityConfig: Record<UserCapability, { icon: typeof Truck; label: string; color: string }> = {
  producer: {
    icon: Wheat,
    label: 'Produtor',
    color: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
  },
  driver: {
    icon: Truck,
    label: 'Motorista',
    color: 'bg-primary/10 text-primary hover:bg-primary/20',
  },
  company_admin: {
    icon: Building2,
    label: 'Empresa',
    color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
  },
};

export function DashboardHeader({
  userName,
  activeCapability,
  capabilities,
  onCapabilityChange,
  onLogout,
  onSettings,
}: DashboardHeaderProps) {
  const ActiveIcon = capabilityConfig[activeCapability].icon;

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Role */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">
                Frete<span className="text-primary">Boi</span>
              </h1>
              <p className="text-xs text-muted-foreground -mt-0.5">
                Painel {capabilityConfig[activeCapability].label}
              </p>
            </div>
          </div>

          {/* Capability Switcher (if multiple) */}
          {capabilities.length > 1 && (
            <div className="hidden md:flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
              {capabilities.map((cap) => {
                const config = capabilityConfig[cap];
                const Icon = config.icon;
                const isActive = cap === activeCapability;
                return (
                  <button
                    key={cap}
                    onClick={() => onCapabilityChange(cap)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                      isActive 
                        ? "bg-card shadow-sm text-foreground" 
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{config.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            {onSettings && (
              <Button variant="ghost" size="icon" onClick={onSettings}>
                <Settings className="h-5 w-5" />
              </Button>
            )}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border ml-2">
              <span className="text-sm text-muted-foreground">
                Olá, <span className="font-medium text-foreground">{userName}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={onLogout} className="md:hidden">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
