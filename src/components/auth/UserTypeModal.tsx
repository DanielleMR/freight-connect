import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck, User, Building2 } from "lucide-react";

export type UserType = "producer" | "driver" | "company_admin";

interface UserTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "login" | "register";
}

const UserTypeModal = ({ open, onOpenChange, mode }: UserTypeModalProps) => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  const options = [
    {
      id: "producer" as const,
      icon: User,
      title: "Proprietário de Animais",
      description: "Solicitar fretes para transportar seus animais",
      loginRoute: "/auth?tipo=producer",
      registerRoute: "/cadastro/produtor",
    },
    {
      id: "driver" as const,
      icon: Truck,
      title: "Caminhoneiro",
      description: "Aceitar e realizar fretes de transporte de animais",
      loginRoute: "/auth?tipo=driver",
      registerRoute: "/cadastro/motorista",
    },
    {
      id: "company_admin" as const,
      icon: Building2,
      title: "Empresa de Transporte",
      description: "Gerenciar frota de veículos e motoristas",
      loginRoute: "/auth?tipo=company_admin",
      registerRoute: "/cadastro/empresa",
    },
  ];

  const handleContinue = () => {
    const option = options.find((o) => o.id === selectedType);
    if (option) {
      onOpenChange(false);
      navigate(mode === "login" ? option.loginRoute : option.registerRoute);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "Selecione seu Perfil" : "Criar Nova Conta"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "Escolha como deseja acessar a plataforma"
              : "Escolha o tipo de conta que deseja criar"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedType(option.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedType === option.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <option.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{option.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleContinue}
            disabled={!selectedType}
          >
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserTypeModal;
