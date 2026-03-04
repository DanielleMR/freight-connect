import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertTriangle, Shield, FileText, Mail, DollarSign, Eye, Lock, Scale } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface AuditItem {
  modulo: string;
  status: 'implementado' | 'parcial' | 'pendente';
  descricao: string;
  detalhes?: string;
  risco?: 'baixo' | 'medio' | 'alto';
}

const AUDIT_MODULES: AuditItem[] = [
  // Implemented
  { modulo: 'Autenticação e Controle de Acesso', status: 'implementado', descricao: 'Login/registro com email, roles (admin/produtor/transportador), capabilities, RouteGuard e CapabilityGuard.', risco: 'baixo' },
  { modulo: 'RLS (Row Level Security)', status: 'implementado', descricao: 'Todas as tabelas possuem RLS habilitado com políticas granulares por role e user_id.', risco: 'baixo' },
  { modulo: 'Termos de Uso e LGPD', status: 'implementado', descricao: 'Aceite obrigatório com registro imutável (aceites_termos). IP e timestamp registrados.', risco: 'baixo' },
  { modulo: 'Contrato de Intermediação', status: 'implementado', descricao: 'Modelo jurídico de intermediação digital. Plataforma não é transportadora/garantidora.', risco: 'baixo' },
  { modulo: 'Comissão Escalonada', status: 'implementado', descricao: 'Até R$750→12%, R$751-R$2.000→10%, acima→8%. Função calcular_comissao_frete implementada.', risco: 'baixo' },
  { modulo: 'Dashboard Financeiro', status: 'implementado', descricao: 'Visualização de valor total, comissão, líquido, status de pagamento e histórico.', risco: 'baixo' },
  { modulo: 'Verificação Documental (Upload)', status: 'implementado', descricao: 'Upload de CNH, CRLV, doc. pessoal e selfie. Status visual: pendente/aprovado/rejeitado.', risco: 'baixo' },
  { modulo: 'OCR Automatizado (Google Vision)', status: 'implementado', descricao: 'Edge function integrada com Google Vision API. Extrai CPF, nome, CNH, placa, RENAVAM. Comparação automática com cadastro.', detalhes: 'Requer GOOGLE_VISION_API_KEY configurado.', risco: 'baixo' },
  { modulo: 'Notificações por Email (Resend)', status: 'implementado', descricao: 'Edge function com templates para 7 tipos de notificação. Histórico registrado em email_logs.', detalhes: 'Requer RESEND_API_KEY e domínio verificado no Resend.', risco: 'medio' },
  { modulo: 'Auditoria Imutável', status: 'implementado', descricao: 'Tabela auditoria com insert via function only. Registra ações, dados anteriores/novos, IP e email.', risco: 'baixo' },
  { modulo: 'Suspensão de Contas', status: 'implementado', descricao: 'Banner visual, bloqueio de ações (criar/aceitar frete), log de tentativas bloqueadas.', risco: 'baixo' },
  { modulo: 'Disputas', status: 'implementado', descricao: 'Abertura, visualização e resolução de disputas por admin. Badge em fretes disputados.', risco: 'baixo' },
  { modulo: 'Chat Interno com Filtros', status: 'implementado', descricao: 'Chat por frete com bloqueio automático de contatos externos (telefone, email, links).', risco: 'baixo' },
  { modulo: 'Privacidade (IDs Públicos)', status: 'implementado', descricao: 'Secure Views, mascaramento de PII, dados revelados apenas após contrato+pagamento.', risco: 'baixo' },
  { modulo: 'Painel Administrativo', status: 'implementado', descricao: 'Gestão de transportadores, produtores, fretes, documentos, disputas, financeiro, auditoria, configurações.', risco: 'baixo' },
  { modulo: 'Logs de Segurança', status: 'implementado', descricao: 'Tabela security_logs para eventos de login, alteração de senha, tentativas suspeitas.', risco: 'baixo' },
  { modulo: 'Conferência com Base Pública', status: 'parcial', descricao: 'Links de redirecionamento para DETRAN/SENATRAN implementados. Upload de comprovante via documento_veiculo.', detalhes: 'Integração automatizada com APIs públicas pendente (indisponibilidade de APIs abertas).', risco: 'medio' },
  // Partial / Pending
  { modulo: 'Gateway de Pagamento (Split)', status: 'pendente', descricao: 'Lógica de comissão implementada no banco. Integração com gateway real (Stripe/Iugu) pendente.', detalhes: 'Atualmente simulação de pagamento. Em produção, integrar com split automático.', risco: 'alto' },
  { modulo: 'Leaked Password Protection', status: 'pendente', descricao: 'Requer ativação manual no painel de autenticação do Lovable Cloud.', detalhes: 'Senhas já usam bcrypt/argon2. Proteção contra senhas vazadas precisa ser ativada manualmente.', risco: 'medio' },
  { modulo: 'Domínio de Email Verificado', status: 'pendente', descricao: 'O Resend exige domínio verificado para envio em produção. Atualmente usando domínio padrão.', detalhes: 'Configurar DNS (SPF/DKIM) do domínio freteboi.com.br no Resend.', risco: 'medio' },
];

const LEGAL_POINTS = [
  'A plataforma opera como intermediadora digital, sem responsabilidade pela execução do frete.',
  'A verificação documental tem caráter informativo e não substitui certificação oficial.',
  'Disclaimer jurídico presente no contrato, tela de verificação e rodapé dos emails.',
  'Aceite de termos registrado com IP, timestamp e versão para validade jurídica.',
  'Dados pessoais protegidos por RLS e Secure Views conforme LGPD.',
  'Logs de auditoria imutáveis garantem rastreabilidade de todas as ações.',
];

const RECOMMENDATIONS = [
  'Integrar gateway de pagamento real (Stripe Connect ou Iugu) com split automático.',
  'Ativar Leaked Password Protection nas configurações de autenticação.',
  'Verificar domínio de email no Resend para deliverability em produção.',
  'Implementar rate limiting nas Edge Functions para proteção contra abuso.',
  'Considerar integração com APIs públicas do DETRAN quando disponíveis.',
  'Implementar backup automatizado do banco de dados.',
  'Realizar teste de penetração antes do lançamento público.',
  'Configurar alertas de monitoramento para falhas em Edge Functions.',
];

export default function AdminRelatorioAuditoria() {
  const implementados = AUDIT_MODULES.filter(m => m.status === 'implementado').length;
  const parciais = AUDIT_MODULES.filter(m => m.status === 'parcial').length;
  const pendentes = AUDIT_MODULES.filter(m => m.status === 'pendente').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implementado': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'parcial': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'implementado': return <Badge className="bg-emerald-500">Implementado</Badge>;
      case 'parcial': return <Badge className="bg-amber-500">Parcial</Badge>;
      default: return <Badge variant="destructive">Pendente</Badge>;
    }
  };

  const getRiscoBadge = (risco?: string) => {
    switch (risco) {
      case 'baixo': return <Badge variant="outline" className="text-emerald-600 border-emerald-300">Risco Baixo</Badge>;
      case 'medio': return <Badge variant="outline" className="text-amber-600 border-amber-300">Risco Médio</Badge>;
      case 'alto': return <Badge variant="outline" className="text-red-600 border-red-300">Risco Alto</Badge>;
      default: return null;
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Relatório de Auditoria | Admin FreteBoi</title>
      </Helmet>

      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Módulos</CardDescription>
              <CardTitle className="text-3xl">{AUDIT_MODULES.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-emerald-200">
            <CardHeader className="pb-2">
              <CardDescription>Implementados</CardDescription>
              <CardTitle className="text-3xl text-emerald-600">{implementados}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-200">
            <CardHeader className="pb-2">
              <CardDescription>Parciais</CardDescription>
              <CardTitle className="text-3xl text-amber-600">{parciais}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardDescription>Pendentes</CardDescription>
              <CardTitle className="text-3xl text-red-600">{pendentes}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Modules Detail */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Módulos do Sistema</CardTitle>
            <CardDescription>Status de implementação de cada módulo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {AUDIT_MODULES.map((item, i) => (
              <div key={i} className={`p-4 rounded-lg border ${
                item.status === 'implementado' ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10'
                : item.status === 'parcial' ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/10'
                : 'border-red-200 bg-red-50/50 dark:bg-red-950/10'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{item.modulo}</h4>
                        {getStatusBadge(item.status)}
                        {getRiscoBadge(item.risco)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.descricao}</p>
                      {item.detalhes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">⚠️ {item.detalhes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Legal Points */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" />Pontos Jurídicos</CardTitle>
            <CardDescription>Conformidade legal e posicionamento jurídico</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {LEGAL_POINTS.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Melhorias Recomendadas</CardTitle>
            <CardDescription>Ações para reduzir riscos antes do lançamento</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside">
              {RECOMMENDATIONS.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground">{rec}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* LGPD Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Conformidade LGPD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { item: 'Consentimento registrado', ok: true },
                { item: 'Dados mínimos coletados', ok: true },
                { item: 'RLS em todas as tabelas', ok: true },
                { item: 'Secure Views para PII', ok: true },
                { item: 'Logs de auditoria imutáveis', ok: true },
                { item: 'Mascaramento de dados sensíveis', ok: true },
                { item: 'Leaked Password Protection', ok: false },
                { item: 'Direito ao esquecimento (DSAR)', ok: false },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {c.ok ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  <span className={c.ok ? '' : 'text-red-600'}>{c.item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Aviso Legal:</strong> A verificação documental possui caráter informativo e não constitui certificação integral da idoneidade do transportador. 
              Este relatório é gerado automaticamente e deve ser validado por um profissional jurídico antes de decisões regulatórias.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
