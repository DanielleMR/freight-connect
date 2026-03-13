import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense } from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import CapabilityGuard from "@/components/auth/CapabilityGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

// Lazy-loaded pages
const Transportadores = lazy(() => import("./pages/Transportadores"));
const SolicitarFrete = lazy(() => import("./pages/SolicitarFrete"));
const Fretes = lazy(() => import("./pages/Fretes"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const CompletarPerfil = lazy(() => import("./pages/CompletarPerfil"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const VerificacaoDocumental = lazy(() => import("./pages/VerificacaoDocumental"));
const SegurancaConta = lazy(() => import("./pages/SegurancaConta"));

// Registration
const CadastroProdutor = lazy(() => import("./pages/cadastro/CadastroProdutor"));
const CadastroMotorista = lazy(() => import("./pages/cadastro/CadastroMotorista"));
const CadastroEmpresa = lazy(() => import("./pages/cadastro/CadastroEmpresa"));

// Legacy
const ProdutorCadastro = lazy(() => import("./pages/produtor/ProdutorCadastro"));
const ProdutorPainel = lazy(() => import("./pages/produtor/ProdutorPainel"));
const TransportadorCadastro = lazy(() => import("./pages/transportador/TransportadorCadastro"));
const TransportadorPainel = lazy(() => import("./pages/transportador/TransportadorPainel"));
const TransportadorFinanceiro = lazy(() => import("./pages/transportador/TransportadorFinanceiro"));

// Maps & Contracts
const MapaTransportadores = lazy(() => import("./pages/mapa/MapaTransportadores"));
const ContratoFrete = lazy(() => import("./pages/contrato/ContratoFrete"));

// Admin
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminTransportadores = lazy(() => import("./pages/admin/AdminTransportadores"));
const AdminTransportadorNovo = lazy(() => import("./pages/admin/AdminTransportadorNovo"));
const AdminProdutores = lazy(() => import("./pages/admin/AdminProdutores"));
const AdminFretes = lazy(() => import("./pages/admin/AdminFretes"));
const AdminAuditoria = lazy(() => import("./pages/admin/AdminAuditoria"));
const AdminContratos = lazy(() => import("./pages/admin/AdminContratos"));
const AdminDocumentos = lazy(() => import("./pages/admin/AdminDocumentos"));
const AdminChats = lazy(() => import("./pages/admin/AdminChats"));
const AdminFinanceiro = lazy(() => import("./pages/admin/AdminFinanceiro"));
const AdminConfiguracoes = lazy(() => import("./pages/admin/AdminConfiguracoes"));
const AdminOperacoes = lazy(() => import("./pages/admin/AdminOperacoes"));
const AdminRelatorioAuditoria = lazy(() => import("./pages/admin/AdminRelatorioAuditoria"));
const AdminEmailLogs = lazy(() => import("./pages/admin/AdminEmailLogs"));
const AdminDenuncias = lazy(() => import("./pages/admin/AdminDenuncias"));
const FretesDisponiveis = lazy(() => import("./pages/FretesDisponiveis"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/transportadores" element={<Transportadores />} />
              <Route path="/fretes-disponiveis" element={<FretesDisponiveis />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              
              {/* Registration routes */}
              <Route path="/cadastro/produtor" element={<CadastroProdutor />} />
              <Route path="/cadastro/motorista" element={<CadastroMotorista />} />
              <Route path="/cadastro/empresa" element={<CadastroEmpresa />} />
              
              {/* Profile completion (referenced by CapabilityGuard) */}
              <Route path="/completar-perfil" element={<CompletarPerfil />} />
              
              {/* Legacy routes */}
              <Route path="/produtor/cadastro" element={<ProdutorCadastro />} />
              <Route path="/transportador/cadastro" element={<TransportadorCadastro />} />
              
              {/* Protected: Unified Dashboard */}
              <Route path="/painel" element={
                <CapabilityGuard requiredCapabilities={['producer', 'driver', 'company_admin']}>
                  <Dashboard />
                </CapabilityGuard>
              } />
              
              {/* Protected: Document Verification */}
              <Route path="/verificacao-documental" element={
                <CapabilityGuard requiredCapabilities={['producer', 'driver', 'company_admin']}>
                  <VerificacaoDocumental />
                </CapabilityGuard>
              } />

              {/* Protected: Account Security */}
              <Route path="/seguranca" element={
                <CapabilityGuard requiredCapabilities={['producer', 'driver', 'company_admin']}>
                  <SegurancaConta />
                </CapabilityGuard>
              } />
              
              {/* Protected: Produtor routes */}
              <Route path="/produtor/painel" element={
                <CapabilityGuard requiredCapabilities={['producer']}>
                  <ProdutorPainel />
                </CapabilityGuard>
              } />
              <Route path="/solicitar-frete/:transportadorPublicId" element={
                <CapabilityGuard requiredCapabilities={['producer']}>
                  <SolicitarFrete />
                </CapabilityGuard>
              } />
              <Route path="/mapa/transportadores" element={
                <CapabilityGuard requiredCapabilities={['producer']}>
                  <MapaTransportadores />
                </CapabilityGuard>
              } />

              {/* Protected: Driver routes */}
              <Route path="/motorista/painel" element={
                <CapabilityGuard requiredCapabilities={['driver']}>
                  <TransportadorPainel />
                </CapabilityGuard>
              } />
              <Route path="/motorista/financeiro" element={
                <CapabilityGuard requiredCapabilities={['driver']}>
                  <TransportadorFinanceiro />
                </CapabilityGuard>
              } />
              
              {/* Legacy transportador routes */}
              <Route path="/transportador/painel" element={
                <RouteGuard allowedRoles={['transportador']}>
                  <TransportadorPainel />
                </RouteGuard>
              } />
              <Route path="/transportador/financeiro" element={
                <RouteGuard allowedRoles={['transportador']}>
                  <TransportadorFinanceiro />
                </RouteGuard>
              } />

              {/* Protected: Shared routes */}
              <Route path="/fretes" element={
                <CapabilityGuard requiredCapabilities={['producer', 'driver']}>
                  <Fretes />
                </CapabilityGuard>
              } />
              <Route path="/contrato/:fretePublicId" element={
                <CapabilityGuard requiredCapabilities={['producer', 'driver']}>
                  <ContratoFrete />
                </CapabilityGuard>
              } />

              {/* Protected: Admin routes */}
              <Route path="/admin/transportadores" element={<RouteGuard allowedRoles={['admin']}><AdminTransportadores /></RouteGuard>} />
              <Route path="/admin/transportadores/novo" element={<RouteGuard allowedRoles={['admin']}><AdminTransportadorNovo /></RouteGuard>} />
              <Route path="/admin/produtores" element={<RouteGuard allowedRoles={['admin']}><AdminProdutores /></RouteGuard>} />
              <Route path="/admin/fretes" element={<RouteGuard allowedRoles={['admin']}><AdminFretes /></RouteGuard>} />
              <Route path="/admin/contratos" element={<RouteGuard allowedRoles={['admin']}><AdminContratos /></RouteGuard>} />
              <Route path="/admin/documentos" element={<RouteGuard allowedRoles={['admin']}><AdminDocumentos /></RouteGuard>} />
              <Route path="/admin/chats" element={<RouteGuard allowedRoles={['admin']}><AdminChats /></RouteGuard>} />
              <Route path="/admin/financeiro" element={<RouteGuard allowedRoles={['admin']}><AdminFinanceiro /></RouteGuard>} />
              <Route path="/admin/auditoria" element={<RouteGuard allowedRoles={['admin']}><AdminAuditoria /></RouteGuard>} />
              <Route path="/admin/configuracoes" element={<RouteGuard allowedRoles={['admin']}><AdminConfiguracoes /></RouteGuard>} />
              <Route path="/admin/operacoes" element={<RouteGuard allowedRoles={['admin']}><AdminOperacoes /></RouteGuard>} />
              <Route path="/admin/relatorio" element={<RouteGuard allowedRoles={['admin']}><AdminRelatorioAuditoria /></RouteGuard>} />
              <Route path="/admin/emails" element={<RouteGuard allowedRoles={['admin']}><AdminEmailLogs /></RouteGuard>} />
              <Route path="/admin/denuncias" element={<RouteGuard allowedRoles={['admin']}><AdminDenuncias /></RouteGuard>} />
              
              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
