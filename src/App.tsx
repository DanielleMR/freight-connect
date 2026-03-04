import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import RouteGuard from "@/components/auth/RouteGuard";
import CapabilityGuard from "@/components/auth/CapabilityGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Transportadores from "./pages/Transportadores";
import SolicitarFrete from "./pages/SolicitarFrete";
import Fretes from "./pages/Fretes";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminTransportadores from "./pages/admin/AdminTransportadores";
import AdminTransportadorNovo from "./pages/admin/AdminTransportadorNovo";
import AdminProdutores from "./pages/admin/AdminProdutores";
import AdminFretes from "./pages/admin/AdminFretes";
import AdminAuditoria from "./pages/admin/AdminAuditoria";
import AdminContratos from "./pages/admin/AdminContratos";
import AdminDocumentos from "./pages/admin/AdminDocumentos";
import AdminChats from "./pages/admin/AdminChats";
import AdminFinanceiro from "./pages/admin/AdminFinanceiro";
import AdminConfiguracoes from "./pages/admin/AdminConfiguracoes";
import AdminOperacoes from "./pages/admin/AdminOperacoes";
import AdminRelatorioAuditoria from "./pages/admin/AdminRelatorioAuditoria";
import AdminEmailLogs from "./pages/admin/AdminEmailLogs";
import ProdutorCadastro from "./pages/produtor/ProdutorCadastro";
import ProdutorPainel from "./pages/produtor/ProdutorPainel";
import TransportadorCadastro from "./pages/transportador/TransportadorCadastro";
import TransportadorPainel from "./pages/transportador/TransportadorPainel";
import TransportadorFinanceiro from "./pages/transportador/TransportadorFinanceiro";
import MapaTransportadores from "./pages/mapa/MapaTransportadores";
import ContratoFrete from "./pages/contrato/ContratoFrete";
import ResetPassword from "./pages/ResetPassword";
import CadastroProdutor from "./pages/cadastro/CadastroProdutor";
import CadastroMotorista from "./pages/cadastro/CadastroMotorista";
import CadastroEmpresa from "./pages/cadastro/CadastroEmpresa";
import Dashboard from "./pages/Dashboard";
import VerificacaoDocumental from "./pages/VerificacaoDocumental";
import SegurancaConta from "./pages/SegurancaConta";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/transportadores" element={<Transportadores />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Registration routes */}
            <Route path="/cadastro/produtor" element={<CadastroProdutor />} />
            <Route path="/cadastro/motorista" element={<CadastroMotorista />} />
            <Route path="/cadastro/empresa" element={<CadastroEmpresa />} />
            
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
            
            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
