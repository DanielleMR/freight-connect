import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, User, Building2, ArrowLeft, Plus } from "lucide-react";
import { useUserCapabilities } from "@/hooks/useUserCapabilities";
import { useAuth } from "@/hooks/useAuth";

interface CapabilitySelectorProps {
  mode: 'login' | 'register';
  onSelect: (capability: 'producer' | 'driver' | 'company_admin') => void;
}

const CapabilitySelector = ({ mode, onSelect }: CapabilitySelectorProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { capabilities, isProducer, isDriver, isCompanyAdmin } = useUserCapabilities();
  const [selectedCapability, setSelectedCapability] = useState<'producer' | 'driver' | 'company_admin' | null>(null);

  const handleContinue = () => {
    if (selectedCapability) {
      onSelect(selectedCapability);
    }
  };

  const options = [
    {
      id: 'producer' as const,
      icon: User,
      title: 'Proprietário de Animais',
      description: 'Solicitar fretes para transportar seus animais',
      existing: isProducer,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      id: 'driver' as const,
      icon: Truck,
      title: 'Caminhoneiro',
      description: 'Aceitar e realizar fretes de transporte de animais',
      existing: isDriver,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'company_admin' as const,
      icon: Building2,
      title: 'Empresa de Transporte',
      description: 'Gerenciar frota de veículos e motoristas',
      existing: isCompanyAdmin,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  // For login mode, filter to show only existing capabilities
  const availableOptions = mode === 'login' && user && capabilities.length > 0
    ? options.filter(opt => capabilities.includes(opt.id))
    : options;

  return (
    <div className="min-h-screen bg-gradient-earth flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle>
                {mode === 'login' ? 'Selecione seu Perfil' : 'Criar Nova Conta'}
              </CardTitle>
              <CardDescription>
                {mode === 'login' 
                  ? 'Escolha como deseja acessar a plataforma'
                  : 'Escolha o tipo de conta que deseja criar'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedCapability(option.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedCapability === option.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg ${option.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <option.icon className={`h-6 w-6 ${option.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{option.title}</h3>
                    {option.existing && mode === 'register' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Já ativo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                </div>
              </div>
            </button>
          ))}

          {/* Add new capability option for logged-in users */}
          {mode === 'login' && user && capabilities.length > 0 && capabilities.length < 3 && (
            <button
              onClick={() => navigate('/adicionar-perfil')}
              className="w-full p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-muted-foreground">Adicionar Novo Perfil</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ative outras capacidades na sua conta
                  </p>
                </div>
              </div>
            </button>
          )}

          <div className="pt-4 space-y-3">
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleContinue}
              disabled={!selectedCapability}
            >
              Continuar
            </Button>
            
            {mode === 'register' && (
              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto" 
                  onClick={() => navigate("/auth?tipo=producer")}
                >
                  Fazer login
                </Button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CapabilitySelector;
