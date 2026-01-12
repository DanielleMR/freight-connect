import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CreditCard, Crown, CheckCircle, AlertCircle, Truck, MapPin } from 'lucide-react';

interface PagamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  freteId: string;
  fretePublicId: string;
  transportadorId: string;
  valorFrete: number;
  origem: string;
  destino: string;
  onPagamentoConfirmado: () => void;
}

export function PagamentoModal({
  open,
  onOpenChange,
  freteId,
  fretePublicId,
  transportadorId,
  valorFrete,
  origem,
  destino,
  onPagamentoConfirmado
}: PagamentoModalProps) {
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<'comissao' | 'assinatura'>('comissao');
  const [processando, setProcessando] = useState(false);

  const valorComissao = valorFrete * 0.08;
  const valorAssinatura = 1500;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleConfirmarPagamento = async () => {
    setProcessando(true);
    
    try {
      let pagamentoId: string | null = null;

      if (opcaoSelecionada === 'comissao') {
        // Criar pagamento de comissão
        const { data, error } = await supabase.rpc('criar_pagamento_comissao', {
          p_frete_id: freteId,
          p_transportador_id: transportadorId,
          p_valor_frete: valorFrete
        });

        if (error) throw error;
        pagamentoId = data;
      } else {
        // Criar assinatura Pro
        const { data, error } = await supabase.rpc('criar_assinatura_pro', {
          p_transportador_id: transportadorId
        });

        if (error) throw error;
        pagamentoId = data;
      }

      // Se tiver pagamento, confirmar (simular gateway)
      if (pagamentoId) {
        const { error: confirmError } = await supabase.rpc('confirmar_pagamento', {
          p_pagamento_id: pagamentoId
        });

        if (confirmError) throw confirmError;
      }

      toast.success(
        opcaoSelecionada === 'assinatura' 
          ? 'Assinatura PRO ativada! Todos os seus fretes agora têm 0% de comissão.'
          : 'Pagamento confirmado! Dados do produtor liberados.'
      );
      
      onPagamentoConfirmado();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao processar pagamento: ' + error.message);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Confirmar Pagamento
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja pagar para liberar este frete
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info do Frete */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Frete</span>
              <Badge variant="outline" className="font-mono">{fretePublicId}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{origem} → {destino}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor do Frete</span>
              <span className="font-bold text-lg">{formatCurrency(valorFrete)}</span>
            </div>
          </div>

          <Separator />

          {/* Opções de Pagamento */}
          <RadioGroup 
            value={opcaoSelecionada} 
            onValueChange={(value) => setOpcaoSelecionada(value as 'comissao' | 'assinatura')}
            className="space-y-3"
          >
            {/* Opção Comissão */}
            <div 
              className={`relative flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                opcaoSelecionada === 'comissao' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => setOpcaoSelecionada('comissao')}
            >
              <RadioGroupItem value="comissao" id="comissao" className="mt-1" />
              <Label htmlFor="comissao" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Pagar Comissão</p>
                    <p className="text-sm text-muted-foreground">
                      8% sobre o valor deste frete
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{formatCurrency(valorComissao)}</p>
                    <p className="text-xs text-muted-foreground">apenas este frete</p>
                  </div>
                </div>
              </Label>
            </div>

            {/* Opção Assinatura PRO */}
            <div 
              className={`relative flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                opcaoSelecionada === 'assinatura' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : 'hover:bg-muted/50'
              }`}
              onClick={() => setOpcaoSelecionada('assinatura')}
            >
              <RadioGroupItem value="assinatura" id="assinatura" className="mt-1" />
              <Label htmlFor="assinatura" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Assinar PRO</p>
                      <Badge className="bg-yellow-500">
                        <Crown className="h-3 w-3 mr-1" />
                        RECOMENDADO
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      0% de comissão por 12 meses
                    </p>
                    <ul className="mt-2 space-y-1">
                      <li className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" /> Destaque no mapa
                      </li>
                      <li className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" /> Prioridade nas listagens
                      </li>
                    </ul>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-yellow-600">{formatCurrency(valorAssinatura)}</p>
                    <p className="text-xs text-muted-foreground">ou 12x R$ 129</p>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Aviso */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
            <p className="text-blue-700 dark:text-blue-300">
              Após o pagamento, os dados de contato do produtor serão liberados e você poderá avançar com o frete.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processando}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmarPagamento}
            disabled={processando}
            className={opcaoSelecionada === 'assinatura' 
              ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600'
              : ''
            }
          >
            {processando ? 'Processando...' : `Pagar ${formatCurrency(opcaoSelecionada === 'comissao' ? valorComissao : valorAssinatura)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
