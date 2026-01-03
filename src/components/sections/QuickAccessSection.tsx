import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tractor, Truck, ShieldCheck, MapPin } from "lucide-react";

/**
 * QuickAccessSection - Seção de acesso rápido para os diferentes perfis
 */
const QuickAccessSection = () => {
  const navigate = useNavigate();

  const accessButtons = [
    {
      title: "Produtor",
      description: "Cadastre-se ou acesse seu painel para solicitar fretes",
      icon: Tractor,
      path: "/produtor/cadastro",
      variant: "default" as const,
    },
    {
      title: "Transportador",
      description: "Gerencie seus fretes e atualize sua disponibilidade",
      icon: Truck,
      path: "/transportador/cadastro",
      variant: "secondary" as const,
    },
    {
      title: "Administrador",
      description: "Acesso restrito ao painel administrativo",
      icon: ShieldCheck,
      path: "/admin",
      variant: "outline" as const,
    },
  ];

  return (
    <section className="py-16 bg-gradient-earth">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Acesso Rápido
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Escolha seu perfil para acessar a área correspondente
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {accessButtons.map((btn) => (
            <div
              key={btn.title}
              className="bg-card rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-border group hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <btn.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                {btn.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {btn.description}
              </p>
              <Button
                variant={btn.variant}
                className="w-full"
                onClick={() => navigate(btn.path)}
              >
                Acessar
              </Button>
            </div>
          ))}
        </div>

        {/* Botão para o mapa */}
        <div className="mt-12 text-center">
          <Button
            size="lg"
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/mapa")}
          >
            <MapPin className="w-5 h-5" />
            Ver Mapa de Transportadores
          </Button>
        </div>
      </div>
    </section>
  );
};

export default QuickAccessSection;
