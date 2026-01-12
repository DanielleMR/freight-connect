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
CONTRATO DIGITAL DE PRESTAÇÃO DE SERVIÇO DE TRANSPORTE DE ANIMAIS
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

═══════════════════════════════════════════════════════════════════════════════

OBJETO DO CONTRATO

O presente contrato tem por objeto a prestação de serviço de transporte de animais vivos, conforme especificações abaixo:

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
${frete.valor_contraproposta ? `• Valor Original: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(frete.valor_frete || 0)}` : ''}

═══════════════════════════════════════════════════════════════════════════════

CLÁUSULAS E CONDIÇÕES

1. INTERMEDIAÇÃO E MONETIZAÇÃO:
   A intermediação do frete é realizada exclusivamente pela plataforma,
   sendo devida a taxa conforme modalidade escolhida pelo transportador:
   - COMISSÃO: 8% sobre o valor do frete, ou
   - ASSINATURA PRO: Isenção de comissão mediante plano vigente.
   
   O transportador declara estar ciente de que os dados de contato do
   produtor somente serão liberados após confirmação do pagamento da
   comissão ou verificação de assinatura PRO ativa.

2. RESPONSABILIDADES DO TRANSPORTADOR:
   a) Garantir o bem-estar dos animais durante todo o trajeto;
   b) Possuir toda documentação necessária para o transporte (GTA, certificados sanitários);
   c) Manter o veículo em condições adequadas de higiene e segurança;
   d) Cumprir os prazos acordados, salvo casos de força maior;
   e) Comunicar imediatamente qualquer intercorrência durante o transporte.

3. RESPONSABILIDADES DO CONTRATANTE:
   a) Fornecer toda documentação necessária dos animais (GTA, certificados);
   b) Garantir que os animais estejam em condições de transporte;
   c) Efetuar o pagamento conforme acordado;
   d) Providenciar as condições de embarque e desembarque dos animais.

4. PAGAMENTO:
   O pagamento deverá ser realizado conforme combinação prévia entre as partes.

5. CANCELAMENTO:
   Em caso de cancelamento por qualquer das partes, deverá haver comunicação
   prévia de no mínimo 24 horas. Cancelamentos sem aviso prévio poderão
   estar sujeitos a multas conforme negociação entre as partes.

6. FORÇA MAIOR:
   Nenhuma das partes será responsável por atrasos ou falhas no cumprimento
   de suas obrigações decorrentes de casos fortuitos ou de força maior.

7. FORO:
   Para dirimir quaisquer questões oriundas deste contrato, fica eleito o
   foro da comarca do local de origem do frete.

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
