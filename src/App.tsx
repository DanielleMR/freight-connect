import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
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
import ProdutorCadastro from "./pages/produtor/ProdutorCadastro";
import ProdutorPainel from "./pages/produtor/ProdutorPainel";
import MapaTransportadores from "./pages/mapa/MapaTransportadores";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/transportadores" element={<Transportadores />} />
            <Route path="/solicitar-frete/:transportadorId" element={<SolicitarFrete />} />
            <Route path="/fretes" element={<Fretes />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/transportadores" element={<AdminTransportadores />} />
            <Route path="/admin/transportadores/novo" element={<AdminTransportadorNovo />} />
            <Route path="/admin/produtores" element={<AdminProdutores />} />
            <Route path="/admin/fretes" element={<AdminFretes />} />
            <Route path="/produtor/cadastro" element={<ProdutorCadastro />} />
            <Route path="/produtor/painel" element={<ProdutorPainel />} />
            <Route path="/mapa/transportadores" element={<MapaTransportadores />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
