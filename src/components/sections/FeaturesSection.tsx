import { Shield, Zap, MapPin, Star, Headphones, CreditCard } from "lucide-react";

/**
 * FeaturesSection - Seção de benefícios e diferenciais
 * Apresenta as principais vantagens da plataforma
 */
const FeaturesSection = () => {
  const features = [
    {
      icon: Shield,
      title: "Transportadores Verificados",
      description: "Todos os caminhoneiros passam por verificação de documentos, CNH e histórico.",
      color: "forest",
    },
    {
      icon: Zap,
      title: "Cotação Instantânea",
      description: "Receba propostas de transportadores em poucos minutos após solicitar o frete.",
      color: "gold",
    },
    {
      icon: MapPin,
      title: "Rastreamento em Tempo Real",
      description: "Acompanhe a localização do seu gado durante todo o trajeto.",
      color: "forest",
    },
    {
      icon: Star,
      title: "Sistema de Avaliações",
      description: "Veja as avaliações de outros produtores antes de escolher seu transportador.",
      color: "gold",
    },
    {
      icon: Headphones,
      title: "Suporte 24/7",
      description: "Nossa equipe está disponível a qualquer momento para ajudar você.",
      color: "forest",
    },
    {
      icon: CreditCard,
      title: "Pagamento Seguro",
      description: "Pague com segurança através da plataforma. Liberamos após a entrega.",
      color: "gold",
    },
  ];

  return (
    <section id="transportadores" className="py-20 md:py-32 bg-card">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-gold-light text-earth text-sm font-semibold mb-4">
            Por que escolher a FreteBoi?
          </span>
          <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-foreground mb-4">
            Vantagens que fazem a diferença
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tecnologia e segurança para conectar produtores rurais aos melhores transportadores
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 md:p-8 rounded-2xl bg-background border border-border hover:border-primary/20 hover:shadow-md transition-all duration-300"
            >
              {/* Ícone */}
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
                  feature.color === "forest"
                    ? "bg-forest-light group-hover:bg-primary group-hover:shadow-forest"
                    : "bg-gold-light group-hover:bg-accent group-hover:shadow-gold"
                }`}
              >
                <feature.icon
                  className={`w-7 h-7 transition-colors ${
                    feature.color === "forest"
                      ? "text-primary group-hover:text-primary-foreground"
                      : "text-earth group-hover:text-accent-foreground"
                  }`}
                />
              </div>

              {/* Conteúdo */}
              <h3 className="font-display font-bold text-xl text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
