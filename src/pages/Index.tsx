import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import CTASection from "@/components/sections/CTASection";

/**
 * Index - Página principal (Landing Page)
 * Estrutura completa da página inicial do FreteBoi
 */
const Index = () => {
  return (
    <>
      <Helmet>
        <title>FreteBoi - Transporte de Gado Simples e Seguro</title>
        <meta 
          name="description" 
          content="Conectamos produtores rurais aos melhores transportadores de gado do Brasil. Cotação rápida, segura e com o melhor preço." 
        />
        <meta name="keywords" content="frete boiadeiro, transporte de gado, caminhão boiadeiro, frete de animais" />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <HeroSection />
          <HowItWorksSection />
          <FeaturesSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
