import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck, Tractor } from "lucide-react";

export type UserType = 'transportador' | 'produtor';

interface UserTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'login' | 'register';
  onSelect: (type: UserType) => void;
}

const UserTypeModal = ({ open, onOpenChange, mode, onSelect }: UserTypeModalProps) => {
  const title = mode === 'login' ? 'Como você deseja entrar?' : 'Como você deseja se cadastrar?';
  const description = mode === 'login' 
    ? 'Selecione seu perfil para acessar sua conta'
    : 'Escolha o tipo de conta que deseja criar';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Button
            variant="outline"
            className="w-full h-auto py-5 flex items-center gap-4 justify-start hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => onSelect('transportador')}
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Truck className="h-7 w-7 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-base">Sou Caminhoneiro</p>
              <p className="text-sm text-muted-foreground">
                Transporto animais e quero receber fretes
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full h-auto py-5 flex items-center gap-4 justify-start hover:border-secondary hover:bg-secondary/5 transition-all"
            onClick={() => onSelect('produtor')}
          >
            <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
              <Tractor className="h-7 w-7 text-secondary-foreground" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-base">Sou Proprietário de Animais</p>
              <p className="text-sm text-muted-foreground">
                Tenho animais e preciso de transporte
              </p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserTypeModal;
