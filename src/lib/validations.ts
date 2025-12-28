// Validação de CPF
export function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

// Validação de CNPJ
export function validarCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}

// Validação de CPF ou CNPJ
export function validarCPFouCNPJ(valor: string): boolean {
  const numeros = valor.replace(/[^\d]/g, '');
  if (numeros.length === 11) return validarCPF(numeros);
  if (numeros.length === 14) return validarCNPJ(numeros);
  return false;
}

// Máscara de CPF
export function mascaraCPF(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

// Máscara de CNPJ
export function mascaraCNPJ(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

// Máscara automática para CPF ou CNPJ
export function mascaraCPFouCNPJ(valor: string): string {
  const numeros = valor.replace(/\D/g, '');
  if (numeros.length <= 11) {
    return mascaraCPF(valor);
  }
  return mascaraCNPJ(valor);
}

// Máscara de telefone
export function mascaraTelefone(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

// Máscara de valor monetário
export function mascaraValor(valor: string): string {
  const numero = valor.replace(/\D/g, '');
  const decimal = (parseInt(numero || '0') / 100).toFixed(2);
  return `R$ ${decimal.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

// Converter valor mascarado para número
export function valorParaNumero(valor: string): number {
  return parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}
