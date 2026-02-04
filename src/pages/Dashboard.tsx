import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserCapabilities } from "@/hooks/useUserCapabilities";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  MapPin, 
  FileText,
  TrendingUp,
  Wallet,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { capabilities } = useUserCapabilities();
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const isProducer = activeCapability === 'producer';
  const isDriver = activeCapability === 'driver';

  return (
    <>
      <Helmet>
        <title>Painel | FreteBoi</title>
        <meta name="description" content="Gerencie seus fretes e acompanhe suas operações" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <DashboardHeader
          userName={data?.userName || 'Usuário'}
          activeCapability={activeCapability}
          capabilities={capabilities}
          onCapabilityChange={setActiveCapability}
          onLogout={handleLogout}
        />

        <main className="container mx-auto px-4 py-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-display font-bold text-foreground">
              Bem-vindo, {data?.userName}! 👋
            </h2>
            <p className="text-muted-foreground mt-1">
              {isProducer 
                ? "Acompanhe seus fretes e encontre os melhores transportadores."
                : "Veja os fretes disponíveis e gerencie suas entregas."
              }
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total de Fretes"
              value={data?.stats.total || 0}
              icon={Package}
              variant="accent"
              sparklineData={data?.sparklineData.completed}
              onClick={() => navigate('/fretes')}
            />
            <StatCard
              title={isProducer ? "Pendentes" : "Novas Solicitações"}
              value={data?.stats.pending || 0}
              icon={Clock}
              variant="warning"
              sparklineData={data?.sparklineData.pending}
              onClick={() => navigate('/fretes')}
            />
            <StatCard
              title="Em Andamento"
              value={data?.stats.active || 0}
              icon={Truck}
              variant="info"
              sparklineData={data?.sparklineData.active}
              onClick={() => navigate('/fretes')}
            />
            <StatCard
              title="Concluídos"
              value={data?.stats.completed || 0}
              icon={CheckCircle2}
              variant="success"
              sparklineData={data?.sparklineData.completed}
              onClick={() => navigate('/fretes')}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Quick Actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {isProducer ? (
                      <>
                        <QuickActionCard
                          title="Solicitar Frete"
                          description="Encontre transportadores e solicite um novo frete"
                          icon={Plus}
                          buttonLabel="Novo Frete"
                          onClick={() => navigate('/mapa/transportadores')}
                        />
                        <QuickActionCard
                          title="Ver Transportadores"
                          description="Visualize transportadores disponíveis na sua região"
                          icon={MapPin}
                          buttonLabel="Ver Mapa"
                          buttonVariant="outline"
                          onClick={() => navigate('/mapa/transportadores')}
                        />
                        <QuickActionCard
                          title="Meus Fretes"
                          description="Acompanhe o status de todos os seus fretes"
                          icon={FileText}
                          buttonLabel="Ver Fretes"
                          buttonVariant="secondary"
                          onClick={() => navigate('/fretes')}
                        />
                      </>
                    ) : (
                      <>
                        <QuickActionCard
                          title="Fretes Disponíveis"
                          description="Veja novas oportunidades de frete na sua região"
                          icon={Package}
                          buttonLabel="Ver Fretes"
                          onClick={() => navigate('/fretes')}
                        />
                        <QuickActionCard
                          title="Meus Veículos"
                          description="Gerencie sua frota de veículos"
                          icon={Truck}
                          buttonLabel="Gerenciar"
                          buttonVariant="outline"
                          onClick={() => navigate('/motorista/veiculos')}
                        />
                        <QuickActionCard
                          title="Financeiro"
                          description="Acompanhe ganhos e pagamentos"
                          icon={Wallet}
                          buttonLabel="Ver Financeiro"
                          buttonVariant="secondary"
                          onClick={() => navigate('/motorista/financeiro')}
                        />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <RecentActivityList
                title="Atividade Recente"
                items={data?.recentFretes || []}
                onItemClick={(item) => navigate(`/contrato/${item.publicId}`)}
                onViewAllClick={() => navigate('/fretes')}
                emptyMessage={
                  isProducer 
                    ? "Você ainda não solicitou nenhum frete. Comece agora!"
                    : "Nenhum frete encontrado. Novos fretes aparecerão aqui."
                }
              />
            </div>

            {/* Right Column - Summary */}
            <div className="space-y-6">
              {/* Performance Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Taxa de Conclusão</span>
                      <span className="font-semibold">
                        {data?.stats.total 
                          ? Math.round((data.stats.completed / data.stats.total) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ 
                          width: `${data?.stats.total 
                            ? Math.round((data.stats.completed / data.stats.total) * 100) 
                            : 0}%` 
                        }}
                      />
                    </div>

                    <div className="pt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-muted-foreground">Pendentes</span>
                        </div>
                        <span className="font-medium">{data?.stats.pending || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-muted-foreground">Ativos</span>
                        </div>
                        <span className="font-medium">{data?.stats.active || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-muted-foreground">Concluídos</span>
                        </div>
                        <span className="font-medium">{data?.stats.completed || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-muted-foreground">Cancelados</span>
                        </div>
                        <span className="font-medium">{data?.stats.cancelled || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Future Metrics Placeholder */}
              <Card className="border-dashed">
                <CardContent className="py-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Wallet className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Métricas Financeiras
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Em breve: ganhos, SLA, bem-estar animal
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;
