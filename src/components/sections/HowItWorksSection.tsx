import { FileText, Users, Truck, CheckCircle } from "lucide-react";

/**
 * HowItWorksSection - Seção explicando o funcionamento da plataforma
 * Apresenta os passos para solicitar um frete
 */
const HowItWorksSection = () => {
  const steps = [
    {
      icon: FileText,
      number: "01",
      title: "Solicite o Frete",
      description: "Informe origem, destino, quantidade de animais e data desejada.",
    },
    {
      icon: Users,
      number: "02",
      title: "Receba Propostas",
      description: "Transportadores verificados enviam suas cotações em minutos.",
    },
    {
      icon: Truck,
      number: "03",
      title: "Escolha o Melhor",
      description: "Compare preços, avaliações e escolha o ideal para você.",
    },
    {
      icon: CheckCircle,
      number: "04",
      title: "Transporte Seguro",
      description: "Acompanhe em tempo real e receba seu gado com segurança.",
    },
  ];

  return (
    <section id="como-funciona" className="py-20 md:py-32 bg-gradient-earth">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-forest-light text-primary text-sm font-semibold mb-4">
            Como Funciona
          </span>
          <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-foreground mb-4">
            Simples, Rápido e Seguro
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Em apenas 4 passos você contrata o frete ideal para transportar seu gado
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="group relative bg-card rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            >
              {/* Número decorativo */}
              <span className="absolute top-4 right-4 font-display font-bold text-5xl text-muted/50 group-hover:text-primary/10 transition-colors">
                {step.number}
              </span>

              {/* Ícone */}
              <div className="w-14 h-14 rounded-2xl bg-forest-light flex items-center justify-center mb-6 group-hover:bg-primary group-hover:shadow-forest transition-all duration-300">
                <step.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>

              {/* Conteúdo */}
              <h3 className="font-display font-bold text-xl text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              {/* Linha conectora (exceto último) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
