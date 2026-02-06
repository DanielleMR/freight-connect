import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Lock } from "lucide-react";

interface Props {
  freteId: string;
  fretePublicId: string;
  freteStatus: string;
  pagamentoConfirmado: boolean;
  onSuccess: () => void;
}

export const AdminForcarEncerramento = ({ freteId, fretePublicId, freteStatus, pagamentoConfirmado, onSuccess }: Props) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Only allow force-close for active freights
  const canForceClose = freteStatus === "em_andamento" || freteStatus === "aceito";

  const handleForceClose = async () => {
    if (!motivo.trim()) {
      toast.error("Motivo é obrigatório");
      return;
    }

    if (step === 1) {
      setStep(2);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("fretes")
        .update({
          status: "concluido",
          updated_at: new Date().toISOString(),
        })
        .eq("id", freteId);

      if (error) throw error;

      await supabase.rpc("inserir_auditoria_sistema", {
        p_acao: "encerramento_forcado_admin",
        p_tabela: "fretes",
        p_registro_id: freteId,
        p_dados_anteriores: { status: freteStatus, pagamento_confirmado: pagamentoConfirmado },
        p_dados_novos: {
          status: "concluido",
          motivo_encerramento: motivo,
          encerrado_por: "admin",
        },
      });

      toast.success("Frete encerrado com sucesso");
      setOpen(false);
      setStep(1);
      setMotivo("");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!canForceClose) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-yellow-700 border-yellow-400 hover:bg-yellow-50"
        title="Forçar Encerramento"
      >
        <Lock className="h-3 w-3" />
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setStep(1); setMotivo(""); } else setOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Forçar Encerramento
            </DialogTitle>
            <DialogDescription>
              {step === 1
                ? "Informe o motivo para encerrar este frete antecipadamente."
                : "Confirme o encerramento forçado. Esta ação é irreversível."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Frete:</span> <span className="font-mono">{fretePublicId}</span></p>
              <p><span className="text-muted-foreground">Status atual:</span> {freteStatus}</p>
              <p><span className="text-muted-foreground">Pagamento:</span> {pagamentoConfirmado ? "Confirmado" : "Pendente"}</p>
            </div>

            {pagamentoConfirmado && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-destructive">⚠️ Pagamento já confirmado</p>
                <p className="text-muted-foreground mt-1">Encerrar este frete pode ter implicações financeiras e jurídicas.</p>
              </div>
            )}

            {step === 1 ? (
              <div className="space-y-2">
                <Label>Motivo do Encerramento Forçado *</Label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Solicitação mútua das partes, problema logístico..."
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">Registrado na auditoria do sistema.</p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-yellow-800">Confirme o encerramento</p>
                <ul className="text-yellow-700 mt-2 list-disc list-inside space-y-1">
                  <li>O frete será marcado como "Concluído"</li>
                  <li>O motivo será registrado na auditoria</li>
                  <li>Esta ação não pode ser desfeita</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>Voltar</Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleForceClose}
              disabled={submitting || (step === 1 && !motivo.trim())}
            >
              {submitting ? "Processando..." : step === 1 ? "Continuar" : "Confirmar Encerramento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
