import { Truck, MapPin, Phone, Mail } from "lucide-react";

/**
 * Footer - Rodapé do site
 * Contém informações de contato, links úteis e copyright
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-primary-foreground">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Logo e Descrição */}
          <div className="lg:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">
                Frete<span className="text-accent">Boi</span>
              </span>
            </a>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Conectando produtores rurais aos melhores transportadores de gado do Brasil.
            </p>
          </div>

          {/* Links Rápidos */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Links Rápidos</h4>
            <ul className="space-y-3">
              {["Como Funciona", "Para Transportadores", "Sobre Nós", "Blog"].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-primary-foreground/70 hover:text-accent transition-colors text-sm"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Suporte */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Suporte</h4>
            <ul className="space-y-3">
              {["Central de Ajuda", "Termos de Uso", "Política de Privacidade", "FAQ"].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-primary-foreground/70 hover:text-accent transition-colors text-sm"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Contato</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-primary-foreground/70 text-sm">
                <MapPin className="w-4 h-4 text-accent" />
                <span>São Paulo, SP - Brasil</span>
              </li>
              <li className="flex items-center gap-3 text-primary-foreground/70 text-sm">
                <Phone className="w-4 h-4 text-accent" />
                <span>(11) 99999-9999</span>
              </li>
              <li className="flex items-center gap-3 text-primary-foreground/70 text-sm">
                <Mail className="w-4 h-4 text-accent" />
                <span>contato@freteboi.com.br</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Linha divisória e Copyright */}
        <div className="border-t border-primary-foreground/10 mt-12 pt-8">
          <p className="text-center text-primary-foreground/50 text-sm">
            © {currentYear} FreteBoi. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
