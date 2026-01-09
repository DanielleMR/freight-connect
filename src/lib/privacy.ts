/**
 * Utilitários de privacidade e mascaramento de dados
 */

/**
 * Mascara um telefone: (11) 9****-1234
 */
export function mascaraTelefonePrivado(telefone: string | null | undefined): string {
  if (!telefone) return '***';
  const digits = telefone.replace(/\D/g, '');
  if (digits.length < 6) return '***';
  
  const ddd = digits.slice(0, 2);
  const lastDigits = digits.slice(-4);
  return `(${ddd}) *****-${lastDigits}`;
}

/**
 * Mascara um email: jo***@gm***.com
 */
export function mascaraEmailPrivado(email: string | null | undefined): string {
  if (!email) return '***';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  
  const [local, domain] = parts;
  const domainParts = domain.split('.');
  
  const maskedLocal = local.slice(0, 2) + '***';
  const maskedDomain = domainParts[0].slice(0, 2) + '***.' + domainParts.slice(1).join('.');
  
  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Mascara CPF: ***.456.789-**
 */
export function mascaraCPFPrivado(cpf: string | null | undefined): string {
  if (!cpf) return '***';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***';
  
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

/**
 * Mascara CNPJ: **.456.789/0001-**
 */
export function mascaraCNPJPrivado(cnpj: string | null | undefined): string {
  if (!cnpj) return '***';
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return '***';
  
  return `**.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-**`;
}

/**
 * Mascara CPF ou CNPJ automaticamente
 */
export function mascaraDocumentoPrivado(doc: string | null | undefined): string {
  if (!doc) return '***';
  const digits = doc.replace(/\D/g, '');
  
  if (digits.length === 11) {
    return mascaraCPFPrivado(doc);
  } else if (digits.length === 14) {
    return mascaraCNPJPrivado(doc);
  }
  return '***';
}

/**
 * Mascara nome: Jo** Si***
 */
export function mascaraNomePrivado(nome: string | null | undefined): string {
  if (!nome) return '***';
  
  return nome.split(' ').map(part => {
    if (part.length <= 2) return part;
    return part.slice(0, 2) + '*'.repeat(part.length - 2);
  }).join(' ');
}

/**
 * Mascara endereço: Rua *****, 123 - Ba***
 */
export function mascaraEnderecoPrivado(endereco: string | null | undefined): string {
  if (!endereco) return '***';
  
  // Tentar identificar padrões comuns e mascarar
  const parts = endereco.split(',');
  if (parts.length >= 1) {
    const firstPart = parts[0].split(' ');
    if (firstPart.length > 1) {
      // Manter tipo de logradouro, mascarar nome
      return firstPart[0] + ' *****' + (parts.length > 1 ? ', ***' : '');
    }
  }
  
  return '***';
}

/**
 * Mascara região: Mostra apenas macro-região
 */
export function mascaraRegiaoPrivada(regiao: string | null | undefined): string {
  if (!regiao) return '***';
  
  // Retorna apenas a primeira palavra (geralmente estado ou região macro)
  const parts = regiao.split(/[,-\/]/);
  return parts[0].trim() + (parts.length > 1 ? ' e região' : '');
}

/**
 * Verifica se dados sensíveis devem ser exibidos
 */
export function deveMostrarDadosSensiveis(contratoAceito: boolean, pagamentoConfirmado: boolean = false): boolean {
  return contratoAceito && pagamentoConfirmado;
}

/**
 * Formata ID público para exibição
 */
export function formatarIdPublico(publicId: string | null | undefined): string {
  if (!publicId) return '---';
  return publicId;
}

/**
 * Valida formato de ID público
 */
export function validarIdPublico(publicId: string): boolean {
  // Formato: XX-XXXXXX (2 letras, hífen, 6 caracteres alfanuméricos)
  const regex = /^[A-Z]{2}-[A-Z0-9]{6}$/;
  return regex.test(publicId);
}
