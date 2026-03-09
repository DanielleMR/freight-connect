import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, Upload, FileText, X } from 'lucide-react';

interface ReportUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUserName?: string;
}

const MOTIVOS = [
  { value: 'fraude', label: 'Fraude' },
  { value: 'comportamento_inadequado', label: 'Comportamento inadequado' },
  { value: 'dados_falsos', label: 'Dados falsos' },
  { value: 'golpe', label: 'Golpe' },
  { value: 'outro', label: 'Outro' },
] as const;

export default function ReportUserModal({ open, onOpenChange, reportedUserId, reportedUserName }: ReportUserModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setReason('');
    setDescription('');
    setEvidenceFile(null);
  };

  const handleSubmit = async () => {
    if (!user || !reason || !description.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (description.trim().length < 10) {
      toast.error('A descrição deve ter no mínimo 10 caracteres.');
      return;
    }

    if (description.length > 2000) {
      toast.error('A descrição deve ter no máximo 2000 caracteres.');
      return;
    }

    setLoading(true);
    try {
      let evidenceUrl: string | null = null;
      let evidenceName: string | null = null;

      // Upload evidence if provided
      if (evidenceFile) {
        if (evidenceFile.size > 10 * 1024 * 1024) {
          toast.error('Arquivo muito grande (máx. 10MB)');
          setLoading(false);
          return;
        }

        const safeName = evidenceFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `${user.id}/reports/${Date.now()}_${safeName}`;
        const { error: uploadErr } = await supabase.storage.from('documentos').upload(path, evidenceFile);
        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(path);
        evidenceUrl = publicUrl;
        evidenceName = evidenceFile.name;
      }

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason: reason as any,
        description: description.trim(),
        evidence_url: evidenceUrl,
        evidence_name: evidenceName,
      });

      if (error) throw error;

      toast.success('Denúncia enviada com sucesso. A equipe irá analisar.');
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar denúncia.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Apenas imagens e PDFs são permitidos.');
      return;
    }
    setEvidenceFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Denunciar Usuário
          </DialogTitle>
          <DialogDescription>
            {reportedUserName
              ? `Você está denunciando: ${reportedUserName}`
              : 'Relate um comportamento inadequado ou suspeito.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da denúncia *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhadamente o ocorrido (mín. 10 caracteres)..."
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/2000</p>
          </div>

          {/* Evidence */}
          <div className="space-y-2">
            <Label>Evidência (opcional)</Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.pdf"
              className="hidden"
            />
            {evidenceFile ? (
              <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate flex-1">{evidenceFile.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEvidenceFile(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Anexar evidência (imagem ou PDF)
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={loading || !reason || description.trim().length < 10}
          >
            {loading ? 'Enviando...' : 'Enviar Denúncia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
