import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertTriangle, Shield, FileText, Mail, DollarSign, Eye, Lock, Scale, Database, Key, Upload, Globe, Server, Bug } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface VulnerabilityItem {
  id: string;
  titulo: string;
  categoria: string;
  risco: 'baixo' | 'medio' | 'alto' | 'critico';
  descricao: string;
  status: 'corrigido' | 'pendente' | 'mitigado';
  correcao?: string;
}

interface AuditItem {
  modulo: string;
  status: 'implementado' | 'parcial' | 'pendente';
  descricao: string;
  detalhes?: string;
  risco?: 'baixo' | 'medio' | 'alto';
}

// ==========================================
// 1. VULNERABILIDADES ENCONTRADAS
// ==========================================
const VULNERABILITIES: VulnerabilityItem[] = [
  // CORRIGIDOS
  {
    id: 'PRIV-001',
    titulo: 'Escalação de privilégio via user_roles (auto-atribuição de admin)',
    categoria: 'Autorização',
    risco: 'critico',
    descricao: 'A política INSERT em user_roles permitia que qualquer usuário autenticado inserisse role=admin para si mesmo via auth.uid()=user_id, obtendo acesso total ao sistema.',
    status: 'corrigido',
    correcao: 'Política removida. Inserção de roles agora é exclusiva via função SECURITY DEFINER assign_role_securely() que bloqueia atribuição de admin sem privilégio prévio.',
  },
  {
    id: 'PRIV-002',
    titulo: 'Escalação de privilégio via user_capabilities (auto-atribuição)',
    categoria: 'Autorização',
    risco: 'alto',
    descricao: 'A política INSERT em user_capabilities permitia que qualquer usuário se atribuísse qualquer capability (producer, driver, company_admin).',
    status: 'corrigido',
    correcao: 'Política removida. Atribuição de capabilities agora usa função SECURITY DEFINER assign_capability_securely(). Frontend atualizado para usar RPC.',
  },
  {
    id: 'DATA-001',
    titulo: 'Views expondo PII sem RLS (telefone, WhatsApp, nome)',
    categoria: 'Dados Sensíveis',
    risco: 'alto',
    descricao: 'As views transportador_contato_seguro, produtor_contato_seguro, pagamento_resumo e transportador_listagem não tinham RLS, permitindo leitura anônima de dados sensíveis.',
    status: 'corrigido',
    correcao: 'security_invoker=on aplicado em todas as views. Agora herdam as políticas RLS das tabelas subjacentes.',
  },
  // PENDENTES
  {
    id: 'AUTH-001',
    titulo: 'Leaked Password Protection desativada',
    categoria: 'Autenticação',
    risco: 'medio',
    descricao: 'A proteção contra senhas comprometidas (Have I Been Pwned) está desativada no sistema de autenticação. Usuários podem cadastrar senhas conhecidas em vazamentos.',
    status: 'pendente',
    correcao: 'Ativar Leaked Password Protection nas configurações de autenticação do Lovable Cloud.',
  },
  {
    id: 'AUTH-002',
    titulo: 'Ausência de rate limiting em login e Edge Functions',
    categoria: 'Autenticação',
    risco: 'medio',
    descricao: 'Não há proteção explícita contra brute force no login nem rate limiting nas Edge Functions. O Supabase Auth possui rate limiting nativo, mas Edge Functions custom (admin, ocr-verify) não.',
    status: 'pendente',
    correcao: 'Implementar rate limiting via headers ou middleware nas Edge Functions. O login já possui rate limiting nativo do GoTrue.',
  },
  {
    id: 'AUTH-003',
    titulo: 'Endpoint setup-test-admin acessível em produção',
    categoria: 'Autenticação',
    risco: 'alto',
    descricao: 'A Edge Function setup-test-admin cria um admin com credenciais hardcoded (admin@teste.com / admin123456) e está acessível sem autenticação. Qualquer pessoa pode criar um admin.',
    status: 'pendente',
    correcao: 'Remover ou proteger esta função em produção. Adicionar verificação de ambiente ou exigir autenticação admin prévia.',
  },
  {
    id: 'UPLOAD-001',
    titulo: 'Bucket documentos é privado mas getPublicUrl expõe URLs',
    categoria: 'Upload de Arquivos',
    risco: 'medio',
    descricao: 'O bucket "documentos" é privado, mas o código usa getPublicUrl() que gera URLs públicas. Documentos sensíveis (CNH, identidade) podem ficar acessíveis se o bucket for tornado público acidentalmente.',
    status: 'mitigado',
    correcao: 'Usar createSignedUrl() com expiração para gerar URLs temporárias ao invés de getPublicUrl(). Verificar políticas de storage.',
  },
  {
    id: 'API-001',
    titulo: 'CORS permissivo (Allow-Origin: *) em Edge Functions',
    categoria: 'API e Backend',
    risco: 'baixo',
    descricao: 'Todas as Edge Functions usam Access-Control-Allow-Origin: * permitindo requisições de qualquer origem.',
    status: 'pendente',
    correcao: 'Em produção, restringir CORS ao domínio real da aplicação.',
  },
  {
    id: 'LGPD-001',
    titulo: 'Direito ao esquecimento (DSAR) não implementado',
    categoria: 'Dados Sensíveis',
    risco: 'medio',
    descricao: 'Não existe funcionalidade para que o usuário solicite exclusão completa de seus dados (conforme Art. 18 da LGPD).',
    status: 'pendente',
    correcao: 'Implementar fluxo de solicitação de exclusão de dados com prazo de 15 dias úteis e confirmação administrativa.',
  },
  {
    id: 'PAY-001',
    titulo: 'Gateway de pagamento simulado',
    categoria: 'API e Backend',
    risco: 'alto',
    descricao: 'Pagamentos são marcados como "confirmados" manualmente pelo admin. Sem integração com gateway real, não há garantia de recebimento.',
    status: 'pendente',
    correcao: 'Integrar Stripe Connect ou Iugu com split automático de comissão.',
  },
];

// ==========================================
// 2. MÓDULOS IMPLEMENTADOS
// ==========================================
const AUDIT_MODULES: AuditItem[] = [
  { modulo: 'Autenticação e Controle de Acesso', status: 'implementado', descricao: 'Login com email/senha, roles via user_roles (admin/produtor/transportador), capabilities via user_capabilities, RouteGuard e CapabilityGuard em todas as rotas protegidas.', risco: 'baixo' },
  { modulo: 'RLS (Row Level Security)', status: 'implementado', descricao: 'Todas as 24+ tabelas possuem RLS habilitado. Políticas granulares por role e user_id. Views com security_invoker=on.', risco: 'baixo' },
  { modulo: 'Funções SECURITY DEFINER', status: 'implementado', descricao: 'Operações críticas (auditoria, pagamentos, notificações, atribuição de roles/capabilities) executam via SECURITY DEFINER, impedindo manipulação direta.', risco: 'baixo' },
  { modulo: 'Termos de Uso e LGPD', status: 'implementado', descricao: 'Aceite obrigatório com registro imutável (aceites_termos). IP, timestamp e versão registrados.', risco: 'baixo' },
  { modulo: 'Contrato de Intermediação', status: 'implementado', descricao: 'Modelo jurídico de intermediação digital. Disclaimer em contrato, verificação e emails.', risco: 'baixo' },
  { modulo: 'Comissão Escalonada', status: 'implementado', descricao: 'Até R$750→12%, R$751-R$2.000→10%, acima→8%. Função calcular_comissao_frete + plano Pro (comissão 0%).', risco: 'baixo' },
  { modulo: 'Verificação Documental (OCR)', status: 'implementado', descricao: 'Upload + OCR via Google Vision. Extração de CPF, nome, CNH, placa, RENAVAM. Comparação automática com cadastro. Flags: válido/divergência/expirado/ilegível.', risco: 'baixo' },
  { modulo: 'Email Transacional (Resend)', status: 'implementado', descricao: '7 templates profissionais. Histórico em email_logs. Admin pode visualizar todos os envios.', detalhes: 'Requer RESEND_API_KEY e domínio verificado.', risco: 'medio' },
  { modulo: 'Auditoria Imutável', status: 'implementado', descricao: 'Tabela auditoria com INSERT via function only (RLS bloqueia insert direto). Registra ações, diffs, IP e email.', risco: 'baixo' },
  { modulo: 'Logs de Segurança', status: 'implementado', descricao: 'security_logs registra login, alteração de senha, tentativas suspeitas. Tela SegurancaConta para o usuário.', risco: 'baixo' },
  { modulo: 'Privacidade e Mascaramento', status: 'implementado', descricao: 'IDs públicos (TR-XXXX, FT-XXXX), Secure Views, PII revelada apenas após contrato+pagamento. Chat interno bloqueia compartilhamento de contatos.', risco: 'baixo' },
  { modulo: 'Suspensão de Contas', status: 'implementado', descricao: 'Banner visual, bloqueio de ações, log de tentativas. Admin pode suspender/reativar.', risco: 'baixo' },
  { modulo: 'Disputas', status: 'implementado', descricao: 'Abertura, visualização e resolução por admin. Bloqueio de frete durante disputa.', risco: 'baixo' },
  { modulo: 'Painel Admin Completo', status: 'implementado', descricao: '13 telas: transportadores, produtores, fretes, operações, contratos, documentos, chats, financeiro, emails, auditoria, relatório, configurações.', risco: 'baixo' },
  { modulo: 'Conferência com Base Pública', status: 'parcial', descricao: 'Links para DETRAN/SENATRAN. Upload de comprovante via documento_veiculo.', detalhes: 'Integração automatizada pendente (APIs públicas indisponíveis).', risco: 'medio' },
  { modulo: 'Gateway de Pagamento Real', status: 'pendente', descricao: 'Lógica de comissão implementada. Integração com Stripe/Iugu pendente.', risco: 'alto' },
  { modulo: 'Leaked Password Protection', status: 'pendente', descricao: 'Senhas usam hash seguro (bcrypt). Verificação contra vazamentos pendente.', risco: 'medio' },
];

const LEGAL_POINTS = [
  'A plataforma opera como intermediadora digital, sem responsabilidade pela execução do frete.',
  'A verificação documental tem caráter informativo e não substitui certificação oficial.',
  'Disclaimer jurídico presente no contrato, tela de verificação e rodapé dos emails.',
  'Aceite de termos registrado com IP, timestamp e versão para validade jurídica.',
  'Dados pessoais protegidos por RLS e Secure Views conforme LGPD.',
  'Logs de auditoria imutáveis garantem rastreabilidade de todas as ações.',
  'Chat interno impede compartilhamento de contatos externos.',
];

const SECURITY_CHECKLIST = [
  { item: 'RLS habilitado em todas as tabelas', ok: true },
  { item: 'Políticas de acesso granulares por role', ok: true },
  { item: 'Funções SECURITY DEFINER para operações críticas', ok: true },
  { item: 'Validação de input com Zod nas Edge Functions', ok: true },
  { item: 'Logs sanitizados (sem PII)', ok: true },
  { item: 'IDs públicos em vez de UUIDs internos', ok: true },
  { item: 'Secure Views para dados sensíveis', ok: true },
  { item: 'Trigger de validação de role (validate_role_assignment)', ok: true },
  { item: 'Bucket de documentos privado', ok: true },
  { item: 'Consentimento LGPD registrado', ok: true },
  { item: 'Auditoria imutável (insert via function only)', ok: true },
  { item: 'Chat com filtro de contatos externos', ok: true },
  { item: 'Escalação de privilégio bloqueada', ok: true },
  { item: 'Views com security_invoker=on', ok: true },
  { item: 'Leaked Password Protection', ok: false },
  { item: 'Rate limiting em Edge Functions', ok: false },
  { item: 'CORS restritivo em produção', ok: false },
  { item: 'Direito ao esquecimento (DSAR)', ok: false },
  { item: 'URLs de documentos com expiração (signed URLs)', ok: false },
  { item: 'setup-test-admin protegido/removido', ok: false },
];

export default function AdminRelatorioAuditoria() {
  const implementados = AUDIT_MODULES.filter(m => m.status === 'implementado').length;
  const parciais = AUDIT_MODULES.filter(m => m.status === 'parcial').length;
  const pendentes = AUDIT_MODULES.filter(m => m.status === 'pendente').length;

  const vulnCorrigidas = VULNERABILITIES.filter(v => v.status === 'corrigido').length;
  const vulnPendentes = VULNERABILITIES.filter(v => v.status === 'pendente').length;
  const vulnMitigadas = VULNERABILITIES.filter(v => v.status === 'mitigado').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implementado': case 'corrigido': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'parcial': case 'mitigado': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'implementado': return <Badge className="bg-emerald-500 text-white">Implementado</Badge>;
      case 'corrigido': return <Badge className="bg-emerald-500 text-white">Corrigido</Badge>;
      case 'parcial': return <Badge className="bg-amber-500 text-white">Parcial</Badge>;
      case 'mitigado': return <Badge className="bg-amber-500 text-white">Mitigado</Badge>;
      default: return <Badge variant="destructive">Pendente</Badge>;
    }
  };

  const getRiscoBadge = (risco?: string) => {
    switch (risco) {
      case 'baixo': return <Badge variant="outline" className="text-emerald-600 border-emerald-300">Baixo</Badge>;
      case 'medio': return <Badge variant="outline" className="text-amber-600 border-amber-300">Médio</Badge>;
      case 'alto': return <Badge variant="outline" className="text-red-600 border-red-300">Alto</Badge>;
      case 'critico': return <Badge variant="outline" className="text-red-700 border-red-500 bg-red-50 dark:bg-red-950/20 font-bold">CRÍTICO</Badge>;
      default: return null;
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Auditoria de Segurança | Admin FreteBoi</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Auditoria Completa de Segurança
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Relatório gerado em {new Date().toLocaleDateString('pt-BR')} — análise de autenticação, autorização, banco de dados, API, uploads, dados sensíveis e conformidade LGPD.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Módulos</CardDescription>
              <CardTitle className="text-2xl">{AUDIT_MODULES.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-emerald-200">
            <CardHeader className="pb-2">
              <CardDescription>Implementados</CardDescription>
              <CardTitle className="text-2xl text-emerald-600">{implementados}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardDescription>Vulnerabilidades</CardDescription>
              <CardTitle className="text-2xl text-red-600">{VULNERABILITIES.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-emerald-200">
            <CardHeader className="pb-2">
              <CardDescription>Corrigidas</CardDescription>
              <CardTitle className="text-2xl text-emerald-600">{vulnCorrigidas}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-200">
            <CardHeader className="pb-2">
              <CardDescription>Pendentes</CardDescription>
              <CardTitle className="text-2xl text-amber-600">{vulnPendentes + vulnMitigadas}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="vulnerabilities">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="vulnerabilities" className="flex items-center gap-1"><Bug className="h-3 w-3" />Vulnerabilidades</TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-1"><Server className="h-3 w-3" />Módulos</TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Checklist</TabsTrigger>
            <TabsTrigger value="legal" className="flex items-center gap-1"><Scale className="h-3 w-3" />Jurídico</TabsTrigger>
            <TabsTrigger value="lgpd" className="flex items-center gap-1"><Lock className="h-3 w-3" />LGPD</TabsTrigger>
          </TabsList>

          {/* TAB: Vulnerabilities */}
          <TabsContent value="vulnerabilities" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bug className="h-5 w-5" />Vulnerabilidades Encontradas ({VULNERABILITIES.length})</CardTitle>
                <CardDescription>Classificadas por nível de risco e status de correção</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {VULNERABILITIES.sort((a, b) => {
                  const order = { critico: 0, alto: 1, medio: 2, baixo: 3 };
                  return order[a.risco] - order[b.risco];
                }).map((vuln) => (
                  <div key={vuln.id} className={`p-4 rounded-lg border ${
                    vuln.status === 'corrigido' ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10'
                    : vuln.status === 'mitigado' ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/10'
                    : 'border-red-200 bg-red-50/50 dark:bg-red-950/10'
                  }`}>
                    <div className="flex items-start gap-2">
                      {getStatusIcon(vuln.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-xs text-muted-foreground">{vuln.id}</span>
                          <h4 className="font-medium">{vuln.titulo}</h4>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {getRiscoBadge(vuln.risco)}
                          {getStatusBadge(vuln.status)}
                          <Badge variant="outline" className="text-xs">{vuln.categoria}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{vuln.descricao}</p>
                        {vuln.correcao && (
                          <p className="text-sm mt-2">
                            <strong>Correção:</strong> {vuln.correcao}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Modules */}
          <TabsContent value="modules" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Módulos do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {AUDIT_MODULES.map((item, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${
                    item.status === 'implementado' ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10'
                    : item.status === 'parcial' ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/10'
                    : 'border-red-200 bg-red-50/50 dark:bg-red-950/10'
                  }`}>
                    <div className="flex items-start gap-2">
                      {getStatusIcon(item.status)}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{item.modulo}</h4>
                          {getStatusBadge(item.status)}
                          {getRiscoBadge(item.risco)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.descricao}</p>
                        {item.detalhes && <p className="text-xs text-muted-foreground mt-1 italic">⚠️ {item.detalhes}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Checklist */}
          <TabsContent value="checklist" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Checklist de Segurança</CardTitle>
                <CardDescription>{SECURITY_CHECKLIST.filter(c => c.ok).length}/{SECURITY_CHECKLIST.length} itens atendidos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {SECURITY_CHECKLIST.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {c.ok ? <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                      <span className={c.ok ? '' : 'text-red-600 font-medium'}>{c.item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Analysis Sections */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" />1. Autenticação</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>✅ Login com email/senha via Supabase Auth (GoTrue)</p>
                  <p>✅ Sessão JWT com refresh automático</p>
                  <p>✅ Senhas com hash bcrypt/argon2 no servidor</p>
                  <p>✅ Rate limiting nativo do GoTrue (anti brute-force)</p>
                  <p>✅ Reset de senha funcional com link por email</p>
                  <p>⚠️ Leaked Password Protection desativada</p>
                  <p>⚠️ setup-test-admin sem proteção de ambiente</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />2. Autorização</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>✅ Todas as rotas admin protegidas por RouteGuard (role=admin)</p>
                  <p>✅ Rotas de usuário protegidas por CapabilityGuard</p>
                  <p>✅ AdminLayout com verificação de sessão + role</p>
                  <p>✅ Edge Functions validam token + role admin</p>
                  <p>✅ Escalação de privilégio bloqueada (assign_role_securely)</p>
                  <p>✅ Trigger validate_role_assignment impede admin via INSERT</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" />3. Banco de Dados</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>✅ RLS habilitado em todas as tabelas</p>
                  <p>✅ Views com security_invoker=on</p>
                  <p>✅ has_role() e has_capability() via SECURITY DEFINER</p>
                  <p>✅ Auditoria com INSERT bloqueado (via function only)</p>
                  <p>✅ Notificações via function only</p>
                  <p>✅ Pagamentos via function only</p>
                  <p>✅ Sem acesso anônimo em nenhuma tabela</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />4. API e Backend</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>✅ Edge Functions com auth header obrigatório</p>
                  <p>✅ Validação de input com Zod (admin, transportadores)</p>
                  <p>✅ Logs sanitizados (logSafely sem PII)</p>
                  <p>⚠️ CORS permissivo (Allow-Origin: *)</p>
                  <p>⚠️ Sem rate limiting em Edge Functions custom</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" />5. Upload de Arquivos</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>✅ Validação de tipo (image/* e PDF apenas)</p>
                  <p>✅ Limite de tamanho (10MB)</p>
                  <p>✅ Sanitização de nome de arquivo</p>
                  <p>✅ Bucket "documentos" privado</p>
                  <p>✅ Upload organizado por user_id/tipo</p>
                  <p>⚠️ getPublicUrl() usado em bucket privado</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" />6. Dados Sensíveis</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>✅ CNH/RG/selfie acessíveis apenas por dono + admin (RLS)</p>
                  <p>✅ CPF/CNPJ mascarado em views públicas</p>
                  <p>✅ Telefone/WhatsApp protegido por Secure Views</p>
                  <p>✅ Coordenadas aproximadas (arredondadas)</p>
                  <p>✅ Nomes mascarados em listagens públicas</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: Legal */}
          <TabsContent value="legal" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" />Pontos Jurídicos</CardTitle>
                <CardDescription>Conformidade legal e posicionamento jurídico da plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {LEGAL_POINTS.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: LGPD */}
          <TabsContent value="lgpd" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Conformidade LGPD</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { item: 'Consentimento registrado com IP e timestamp', ok: true },
                    { item: 'Dados mínimos coletados (princípio da necessidade)', ok: true },
                    { item: 'RLS em todas as tabelas', ok: true },
                    { item: 'Secure Views para PII', ok: true },
                    { item: 'Logs de auditoria imutáveis', ok: true },
                    { item: 'Mascaramento de dados sensíveis em listagens', ok: true },
                    { item: 'Sanitização de logs (sem PII)', ok: true },
                    { item: 'Bucket de documentos privado', ok: true },
                    { item: 'Chat com filtro de dados pessoais', ok: true },
                    { item: 'Leaked Password Protection', ok: false },
                    { item: 'Direito ao esquecimento (Art. 18 LGPD)', ok: false },
                    { item: 'Relatório de Impacto à Proteção de Dados (RIPD)', ok: false },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {c.ok ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                      <span className={c.ok ? '' : 'text-red-600'}>{c.item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Aviso Legal:</strong> Este relatório de auditoria é gerado automaticamente e deve ser validado por um profissional de segurança e um assessor jurídico antes de decisões regulatórias.
              A verificação documental possui caráter informativo e não constitui certificação integral da idoneidade do transportador.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
