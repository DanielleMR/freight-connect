import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContratoTextoProps {
  produtor: {
    nome: string;
    cpf_cnpj?: string | null;
    telefone: string;
    cidade?: string | null;
    estado?: string | null;
  };
  transportador: {
    nome: string;
    cpf_cnpj?: string | null;
    telefone: string;
    placa_veiculo?: string | null;
    plano_tipo?: string | null;
  };
  frete: {
    origem: string | null;
    destino: string | null;
    tipo_animal: string | null;
    quantidade_animais: number | null;
    valor_frete: number | null;
    valor_contraproposta?: number | null;
    tipo_cobranca: string | null;
    data_prevista: string | null;
    descricao?: string | null;
  };
  dataGeracao?: string;
  versao?: string;
}

export function gerarTextoContrato({
  produtor,
  transportador,
  frete,
  dataGeracao,
  versao = '1.0'
}: ContratoTextoProps): string {
  const dataFormatada = dataGeracao 
    ? format(new Date(dataGeracao), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
    : format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });

  const valorFinal = frete.valor_contraproposta || frete.valor_frete || 0;
  const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFinal);
  
  const tipoCobrancaTexto = frete.tipo_cobranca === 'valor_km' ? 'por quilômetro' : 'valor fechado';

  return `
CONTRATO DIGITAL DE INTERMEDIAÇÃO DE FRETE DE ANIMAIS
Versão ${versao}

═══════════════════════════════════════════════════════════════════════════════

PARTES CONTRATANTES

CONTRATANTE (PRODUTOR):
Nome: ${produtor.nome}
CPF/CNPJ: ${produtor.cpf_cnpj || 'Não informado'}
Telefone: ${produtor.telefone}
Localidade: ${produtor.cidade || '-'}/${produtor.estado || '-'}

CONTRATADO (TRANSPORTADOR):
Nome: ${transportador.nome}
CPF/CNPJ: ${transportador.cpf_cnpj || 'Não informado'}
Telefone: ${transportador.telefone}
Placa do Veículo: ${transportador.placa_veiculo || 'Não informado'}

PLATAFORMA INTERMEDIADORA:
FreteBoi – Plataforma de Intermediação Digital de Fretes de Animais

═══════════════════════════════════════════════════════════════════════════════

OBJETO DO CONTRATO

O presente contrato regula a intermediação digital entre CONTRATANTE e
CONTRATADO para a prestação de serviço de transporte de animais vivos.

A PLATAFORMA atua EXCLUSIVAMENTE como intermediadora digital, conectando
produtores rurais a transportadores independentes. A PLATAFORMA NÃO
executa, garante, supervisiona ou se responsabiliza pela execução do
transporte, pela integridade dos animais ou por danos decorrentes do frete.

DETALHES DO FRETE:
• Origem: ${frete.origem || 'Não informado'}
• Destino: ${frete.destino || 'Não informado'}
• Tipo de Animal: ${frete.tipo_animal || 'Não especificado'}
• Quantidade de Animais: ${frete.quantidade_animais || 'Não informado'}
• Data Prevista: ${frete.data_prevista ? format(new Date(frete.data_prevista), 'dd/MM/yyyy', { locale: ptBR }) : 'A combinar'}
${frete.descricao ? `• Observações: ${frete.descricao}` : ''}

CONDIÇÕES FINANCEIRAS:
• Valor do Frete: ${valorFormatado}
• Tipo de Cobrança: ${tipoCobrancaTexto}
• Taxa de Intermediação: Conforme faixa aplicável (até R$750: 12%, R$751–R$2.000: 10%, acima de R$2.000: 8%), ou isenta para assinantes PRO.
• Valor Líquido do Transportador: Calculado após desconto automático da taxa.
${frete.valor_contraproposta ? `• Valor Original: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(frete.valor_frete || 0)}` : ''}

═══════════════════════════════════════════════════════════════════════════════

CLÁUSULAS E CONDIÇÕES

1. NATUREZA DA INTERMEDIAÇÃO:
   A PLATAFORMA é um serviço de intermediação digital nos termos do Marco
   Civil da Internet (Lei nº 12.965/2014) e do Código Civil. A plataforma
   NÃO é transportadora, NÃO se responsabiliza pela execução do frete,
   NÃO garante a qualidade do serviço prestado pelo transportador e NÃO
   assume responsabilidade por danos a animais, carga ou terceiros.

2. TAXA DE INTERMEDIAÇÃO:
   A PLATAFORMA cobra uma taxa de intermediação escalonada:
   - Fretes de até R$ 750,00: 12% sobre o valor do frete
   - Fretes de R$ 751,00 a R$ 2.000,00: 10% sobre o valor do frete
   - Fretes acima de R$ 2.000,00: 8% sobre o valor do frete
   - ASSINATURA PRO: Isenção total de taxa mediante plano vigente.
   
   A taxa é retida automaticamente via split de pagamento no momento da
   transação. Os dados de contato do produtor somente são liberados após
   confirmação do pagamento ou verificação de assinatura PRO ativa.

3. RESPONSABILIDADES DO TRANSPORTADOR:
   a) Garantir o bem-estar dos animais durante todo o trajeto;
   b) Possuir toda documentação necessária (GTA, certificados sanitários);
   c) Manter veículo em condições adequadas de higiene e segurança;
   d) Cumprir os prazos acordados, salvo casos de força maior;
   e) Comunicar imediatamente qualquer intercorrência.
   f) A responsabilidade pelo transporte é EXCLUSIVA do transportador.

4. RESPONSABILIDADES DO CONTRATANTE:
   a) Fornecer documentação necessária dos animais (GTA, certificados);
   b) Garantir que os animais estejam em condições de transporte;
   c) Efetuar o pagamento conforme acordado;
   d) Providenciar condições de embarque e desembarque.

5. LIMITAÇÃO DE RESPONSABILIDADE DA PLATAFORMA:
   A PLATAFORMA não se responsabiliza por:
   a) Atrasos, danos ou perdas durante o transporte;
   b) Veracidade das informações fornecidas pelos usuários;
   c) Disputas entre CONTRATANTE e CONTRATADO;
   d) Condições do veículo ou habilitação do transportador;
   e) Cumprimento de obrigações sanitárias e regulatórias.
   
   A PLATAFORMA oferece mecanismo de disputa como facilitadora, sem
   obrigação de resultado.

6. CANCELAMENTO:
   Em caso de cancelamento, comunicação prévia de no mínimo 24 horas.
   Cancelamentos sem aviso prévio poderão estar sujeitos a restrições
   na plataforma.

7. FORÇA MAIOR:
   Nenhuma das partes será responsável por atrasos ou falhas decorrentes
   de casos fortuitos ou de força maior.

8. FORO:
   Fica eleito o foro da comarca do local de origem do frete.

═══════════════════════════════════════════════════════════════════════════════

ACEITE ELETRÔNICO

Este contrato é válido como instrumento particular, nos termos do art. 104
do Código Civil e da Lei nº 14.063/2020 (Marco Legal das Assinaturas
Eletrônicas), sendo o aceite eletrônico considerado manifestação válida
de vontade das partes.

Ao aceitar este contrato, as partes declaram ter lido e concordado com
todos os termos e condições aqui estabelecidos.

Data de Geração: ${dataFormatada}

═══════════════════════════════════════════════════════════════════════════════
`.trim();
}

export function ContratoTexto(props: ContratoTextoProps) {
  const texto = gerarTextoContrato(props);
  
  return (
    <div className="bg-muted/30 border rounded-lg p-4 md:p-6 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[60vh]">
      {texto}
    </div>
  );
}
