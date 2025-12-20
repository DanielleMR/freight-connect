import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Clock, MapPin } from "lucide-react";

/**
 * HeroSection - Seção principal da landing page
 * Apresenta a proposta de valor e CTAs principais
 */
const HeroSection = () => {
  const features = [
    { icon: Shield, text: "Transportadores Verificados" },
    { icon: Clock, text: "Cotação em Minutos" },
    { icon: MapPin, text: "Cobertura Nacional" },
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background com gradiente */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Padrão decorativo */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-accent blur-3xl" />
        <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-primary-foreground blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Conteúdo */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-6 animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-primary-foreground/90 text-sm font-medium">
                +500 fretes realizados este mês
              </span>
            </div>

            {/* Título */}
            <h1 className="font-display font-extrabold text-4xl md:text-5xl lg:text-6xl text-primary-foreground leading-tight mb-6 animate-fade-in-up animation-delay-100">
              O jeito mais fácil de{" "}
              <span className="text-accent">transportar</span> seu gado
            </h1>

            {/* Descrição */}
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-xl mx-auto lg:mx-0 animate-fade-in-up animation-delay-200">
              Conectamos você aos melhores caminhoneiros boiadeiros do Brasil. 
              Cotação rápida, segura e com o melhor preço.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-fade-in-up animation-delay-300">
              <Button variant="hero" size="xl">
                Solicitar Frete
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="hero-outline" size="xl">
                Sou Transportador
              </Button>
            </div>

            {/* Features */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 animate-fade-in-up animation-delay-400">
              {features.map((feature) => (
                <div
                  key={feature.text}
                  className="flex items-center gap-2 text-primary-foreground/80"
                >
                  <feature.icon className="w-5 h-5 text-accent" />
                  <span className="text-sm font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Imagem/Ilustração */}
          <div className="relative hidden lg:block animate-fade-in-up animation-delay-300">
            <div className="relative">
              {/* Card flutuante 1 */}
              <div className="absolute -top-4 -left-4 bg-card rounded-2xl p-4 shadow-lg animate-float z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-forest-light flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-foreground">100%</p>
                    <p className="text-xs text-muted-foreground">Seguro</p>
                  </div>
                </div>
              </div>

              {/* Card principal */}
              <div className="bg-card/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-border">
                <div className="aspect-[4/3] rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=450&fit=crop" 
                    alt="Gado em pasto verde"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Origem</span>
                    <span className="font-medium text-foreground">Uberaba, MG</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Destino</span>
                    <span className="font-medium text-foreground">Barretos, SP</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Preço médio</span>
                    <span className="font-display font-bold text-primary text-lg">R$ 1.850</span>
                  </div>
                </div>
              </div>

              {/* Card flutuante 2 */}
              <div className="absolute -bottom-4 -right-4 bg-accent rounded-2xl p-4 shadow-gold animate-float" style={{ animationDelay: "1s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-foreground/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-accent-foreground">15 min</p>
                    <p className="text-xs text-accent-foreground/70">Tempo médio</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
