import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserCapabilities } from "@/hooks/useUserCapabilities";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTermsAcceptance } from "@/hooks/useTermsAcceptance";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { CapabilityToggle } from "@/components/dashboard/CapabilityToggle";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { TermsAcceptanceModal } from "@/components/auth/TermsAcceptanceModal";
import { SuspensionBanner } from "@/components/common/SuspensionBanner";
import { NotificationBell } from "@/components/ui/notification-bell";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Truck, 
  Clock, 
  Package,
  LogOut,
  Settings,
  ShieldCheck,
  CreditCard,
  Shield
} from "lucide-react";
import { Helmet } from "react-helmet-async";

/**
 * Dashboard - Unified control panel
 * 
 * Design principles:
 * - 70% information / 30% action
 * - Click on metrics to see details
 * - Information-first, action-second
 * - Prepared for future audit/admin features
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { capabilities } = useUserCapabilities();
  const { needsAcceptance, recheckTerms } = useTermsAcceptance();
  const { isSuspended, motivo: suspensionMotivo, suspendedAt } = useSuspensionCheck();
  const { 
    data, 
    loading, 
    activeCapability, 
    setActiveCapability 
  } = useDashboardData();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || { total: 0, pending: 0, active: 0, completed: 0, cancelled: 0, totalAnimals: 0 };

  // Summary items for the sidebar
  const summaryItems = [
    { label: 'Aguardando', value: stats.pending, color: 'bg-amber-500' },
    { label: 'Em andamento', value: stats.active, color: 'bg-blue-500' },
    { label: 'Concluídos', value: stats.completed, color: 'bg-emerald-500' },
    { label: 'Cancelados', value: stats.cancelled, color: 'bg-red-500' },
  ];

  return (
    <>
      <Helmet>
        <title>Painel | FreteBoi</title>
        <meta name="description" content="Painel de controle - Gerencie fretes e acompanhe operações" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header - Minimal */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-hero flex items-center justify-center">
                  <Truck className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-lg">
                  Frete<span className="text-primary">Boi</span>
                </span>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
                  <Settings className="h-5 w-5" />
                </Button>
                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border ml-2">
                  <span className="text-sm text-muted-foreground">
                    {data?.userName}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="container mx-auto px-4 py-6">
          {/* Capability toggle - Simple, non-intrusive */}
          <div className="mb-6">
            <CapabilityToggle
              activeCapability={activeCapability}
              capabilities={capabilities}
              onCapabilityChange={setActiveCapability}
            />
          </div>

          {/* Suspension banner */}
          {isSuspended && (
            <SuspensionBanner motivo={suspensionMotivo} suspendedAt={suspendedAt} />
          )}

          {/* Page title - Minimal */}
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-foreground">
              Painel de Controle
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              O que está acontecendo agora e o que já foi feito
            </p>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Metrics - 4 large clickable cards */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard
                  title="Concluídos"
                  value={stats.completed}
                  icon={CheckCircle2}
                  onClick={() => navigate('/fretes?status=concluido')}
                />
                <MetricCard
                  title="Animais Transportados"
                  value={stats.totalAnimals.toLocaleString('pt-BR')}
                  subtitle="Total histórico"
                  icon={Package}
                  onClick={() => navigate('/fretes?status=concluido')}
                />
                <MetricCard
                  title="Em Andamento"
                  value={stats.active}
                  icon={Truck}
                  onClick={() => navigate('/fretes?status=em_andamento')}
                />
                <MetricCard
                  title="Aguardando"
                  value={stats.pending}
                  subtitle="Pendente transportador"
                  icon={Clock}
                  onClick={() => navigate('/fretes?status=solicitado')}
                />
              </div>

              {/* Activity Timeline */}
              <div className="bg-card rounded-xl border border-border p-5">
                <ActivityTimeline
                  items={data?.recentFretes || []}
                  onItemClick={(item) => navigate(`/contrato/${item.publicId}`)}
                  onViewAllClick={() => navigate('/fretes')}
                  emptyMessage="Nenhum frete registrado ainda"
                />
              </div>
            </div>

            {/* Sidebar - Summary */}
            <div className="space-y-4">
              <DashboardSummary
                title="Resumo de Status"
                items={summaryItems}
                total={stats.total}
              />

              {/* Quick links */}
              <div className="p-5 rounded-xl border border-border bg-card space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Acesso rápido</p>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/verificacao-documental')}>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verificação Documental
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/seguranca')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Segurança da Conta
                </Button>
                {(activeCapability === 'driver') && (
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/motorista/financeiro')}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Financeiro
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Hidden audit hooks for future admin features */}
        <div className="hidden" data-audit-hook="dashboard-root" data-last-updated={data?.auditMeta?.lastUpdated} />

        {/* Terms acceptance modal */}
        {user && needsAcceptance && (
          <TermsAcceptanceModal userId={user.id} open={needsAcceptance} onAccepted={recheckTerms} />
        )}
      </div>
    </>
  );
};

export default Dashboard;
