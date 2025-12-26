import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck } from "lucide-react";

/**
 * CTASection - Seção de chamada para ação final
 * Incentiva o usuário a se cadastrar na plataforma
 */
const CTASection = forwardRef<HTMLElement>((_, ref) => {
  return (
    <section id="contato" className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Padrões decorativos */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-accent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-primary-foreground blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Ícone */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-8">
            <Truck className="w-10 h-10 text-accent" />
          </div>

          {/* Título */}
          <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-primary-foreground mb-6">
            Pronto para simplificar o{" "}
            <span className="text-accent">transporte do seu gado</span>?
          </h2>

          {/* Descrição */}
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Cadastre-se gratuitamente e tenha acesso aos melhores transportadores 
            boiadeiros do Brasil. Sua primeira cotação está a um clique de distância.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl">
              Começar Agora
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="hero-outline" size="xl">
              Falar com Especialista
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-primary-foreground/60 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              Cadastro Gratuito
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              Sem Mensalidade
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              Cancele Quando Quiser
            </span>
          </div>
        </div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";

export default CTASection;
