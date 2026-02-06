import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

interface Props {
  freteId: string;
  fretePublicId: string;
  onSuccess: () => void;
}

export const AdminFreteBlockDisputa = ({ freteId, fretePublicId, onSuccess }: Props) => {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleBlock = async () => {
    if (!motivo.trim()) {
      toast.error("Motivo é obrigatório");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create dispute
      const { error: disputaError } = await supabase.from("disputas").insert({
        frete_id: freteId,
        aberto_por: user?.id,
        motivo,
        status: "em_analise",
      });

      if (disputaError) throw disputaError;

      // Block freight by setting status to recusado
      const { error: freteError } = await supabase
        .from("fretes")
        .update({ status: "recusado", updated_at: new Date().toISOString() })
        .eq("id", freteId);

      if (freteError) throw freteError;

      await supabase.rpc("inserir_auditoria_sistema", {
        p_acao: "bloqueio_frete_disputa",
        p_tabela: "fretes",
        p_registro_id: freteId,
        p_dados_novos: { motivo, bloqueado_por: "admin", disputa_aberta: true },
      });

      toast.success("Frete bloqueado por disputa");
      setOpen(false);
      setMotivo("");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-orange-700 border-orange-300 hover:bg-orange-50"
        title="Bloquear por Disputa"
      >
        <ShieldAlert className="h-3 w-3" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-orange-600" />
              Bloquear Frete por Disputa
            </DialogTitle>
            <DialogDescription>
              O frete <span className="font-mono">{fretePublicId}</span> será bloqueado e uma disputa será aberta automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-orange-800">⚠️ Impacto desta ação:</p>
              <ul className="text-orange-700 mt-1 list-disc list-inside space-y-1">
                <li>Frete será bloqueado (status: recusado)</li>
                <li>Disputa será criada automaticamente</li>
                <li>Partes envolvidas serão impactadas</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label>Motivo do Bloqueio / Disputa *</Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Descreva o motivo detalhadamente..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBlock} disabled={submitting || !motivo.trim()}>
              {submitting ? "Processando..." : "Confirmar Bloqueio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
