import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import RouteGuard from "@/components/auth/RouteGuard";
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
import ProdutorCadastro from "./pages/produtor/ProdutorCadastro";
import ProdutorPainel from "./pages/produtor/ProdutorPainel";
import TransportadorCadastro from "./pages/transportador/TransportadorCadastro";
import TransportadorPainel from "./pages/transportador/TransportadorPainel";
import TransportadorFinanceiro from "./pages/transportador/TransportadorFinanceiro";
import MapaTransportadores from "./pages/mapa/MapaTransportadores";
import ContratoFrete from "./pages/contrato/ContratoFrete";
import ResetPassword from "./pages/ResetPassword";

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
            <Route path="/produtor/cadastro" element={<ProdutorCadastro />} />
            <Route path="/transportador/cadastro" element={<TransportadorCadastro />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Protected: Produtor routes */}
            <Route path="/produtor/painel" element={
              <RouteGuard allowedRoles={['produtor']}>
                <ProdutorPainel />
              </RouteGuard>
            } />
            <Route path="/solicitar-frete/:transportadorPublicId" element={
              <RouteGuard allowedRoles={['produtor']}>
                <SolicitarFrete />
              </RouteGuard>
            } />
            <Route path="/fretes" element={
              <RouteGuard allowedRoles={['produtor', 'transportador']}>
                <Fretes />
              </RouteGuard>
            } />
            <Route path="/contrato/:fretePublicId" element={
              <RouteGuard allowedRoles={['produtor', 'transportador']}>
                <ContratoFrete />
              </RouteGuard>
            } />
            <Route path="/mapa/transportadores" element={
              <RouteGuard allowedRoles={['produtor']}>
                <MapaTransportadores />
              </RouteGuard>
            } />

            {/* Protected: Transportador routes */}
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

            {/* Protected: Admin routes */}
            <Route path="/admin/transportadores" element={
              <RouteGuard allowedRoles={['admin']}>
                <AdminTransportadores />
              </RouteGuard>
            } />
            <Route path="/admin/transportadores/novo" element={
              <RouteGuard allowedRoles={['admin']}>
                <AdminTransportadorNovo />
              </RouteGuard>
            } />
            <Route path="/admin/produtores" element={
              <RouteGuard allowedRoles={['admin']}>
                <AdminProdutores />
              </RouteGuard>
            } />
            <Route path="/admin/fretes" element={
              <RouteGuard allowedRoles={['admin']}>
                <AdminFretes />
              </RouteGuard>
            } />
            <Route path="/admin/contratos" element={
              <RouteGuard allowedRoles={['admin']}>
                <AdminContratos />
              </RouteGuard>
            } />
            <Route path="/admin/documentos" element={
              <RouteGuard allowedRoles={['admin']}>
                <AdminDocumentos />
              </RouteGuard>
            } />
            <Route path="/admin/chats" element={
              <RouteGuard allowedRoles={['admin']}>
                <AdminChats />
              </RouteGuard>
            } />
            <Route path="/admin/financeiro" element={
              <RouteGuard allowedRoles={['admin']}>
                <AdminFinanceiro />
              </RouteGuard>
            } />
            <Route path="/admin/auditoria" element={
              <RouteGuard allowedRoles={['admin']}>
                <AdminAuditoria />
              </RouteGuard>
            } />
            <Route path="/admin/configuracoes" element={
              <RouteGuard allowedRoles={['admin']}>
                <AdminConfiguracoes />
              </RouteGuard>
            } />
            
            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
