import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Shield } from "lucide-react";

interface Props {
  userId: string;
  open: boolean;
  onAccepted: () => void;
}

export const TermsAcceptanceModal = ({ userId, open, onAccepted }: Props) => {
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!termsChecked || !privacyChecked) {
      toast.error("Você deve aceitar ambos os termos");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      const { error } = await supabase.from("aceites_termos").insert([
        {
          user_id: userId,
          tipo_termo: "termos_uso",
          versao: "1.0",
          aceito_em: now,
        },
        {
          user_id: userId,
          tipo_termo: "politica_privacidade",
          versao: "1.0",
          aceito_em: now,
        },
      ]);

      if (error) throw error;

      toast.success("Termos aceitos com sucesso");
      onAccepted();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Termos de Uso e Política de Privacidade
          </DialogTitle>
          <DialogDescription>
            Para continuar usando a plataforma, é necessário aceitar os termos abaixo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[200px] rounded-md border p-4 text-sm text-muted-foreground">
          <h4 className="font-semibold text-foreground mb-2">Termos de Uso — Resumo</h4>
          <p className="mb-3">
            Ao utilizar esta plataforma, você concorda em fornecer informações verídicas,
            utilizar o sistema exclusivamente para fins de transporte de animais conforme
            legislação vigente, e manter seus dados cadastrais atualizados. A plataforma
            atua como intermediadora e não se responsabiliza diretamente pelo transporte.
          </p>
          <h4 className="font-semibold text-foreground mb-2">Política de Privacidade — Resumo (LGPD)</h4>
          <p>
            Seus dados pessoais (nome, CPF/CNPJ, telefone, localização) são coletados para
            viabilizar a operação do sistema e serão armazenados de forma segura. Dados de
            contato só são compartilhados com a contraparte após aceite de contrato e
            confirmação de pagamento. Você tem direito a acessar, corrigir ou solicitar
            exclusão dos seus dados a qualquer momento.
          </p>
        </ScrollArea>

        <div className="space-y-3 pt-2">
          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={termsChecked}
              onCheckedChange={(c) => setTermsChecked(c as boolean)}
            />
            <label htmlFor="terms" className="text-sm cursor-pointer">
              Li e aceito os <span className="text-primary font-medium">Termos de Uso</span>
            </label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="privacy"
              checked={privacyChecked}
              onCheckedChange={(c) => setPrivacyChecked(c as boolean)}
            />
            <label htmlFor="privacy" className="text-sm cursor-pointer">
              Li e aceito a <span className="text-primary font-medium">Política de Privacidade</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={submitting || !termsChecked || !privacyChecked}
            className="w-full"
          >
            {submitting ? "Salvando..." : "Aceitar e Continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
