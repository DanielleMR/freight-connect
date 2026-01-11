// Filtros de conteúdo para bloquear contato externo

// Regex para telefones brasileiros (com ou sem formatação)
const PHONE_PATTERNS = [
  /\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/g, // (11) 99999-9999, 11999999999
  /\+55\s*\d{2}\s*9?\d{4}[-\s]?\d{4}/g, // +55 11 99999-9999
  /\d{10,11}/g, // 11999999999
];

// Regex para emails
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// Regex para links
const LINK_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9-]+\.(com|br|net|org|io|app|site)[^\s]*/gi,
];

// Palavras-chave bloqueadas (case insensitive)
const BLOCKED_KEYWORDS = [
  'whatsapp',
  'whats',
  'wpp',
  'zap',
  'zapzap',
  'telefone',
  'ligar',
  'liga',
  'me liga',
  'me chama',
  'fone',
  '@gmail',
  '@hotmail',
  '@outlook',
  '@yahoo',
  '.com',
  '.com.br',
  'instagram',
  'insta',
  'facebook',
  'telegram',
];

interface ValidationResult {
  isBlocked: boolean;
  reason: string | null;
}

export function validateChatMessage(content: string): ValidationResult {
  const normalizedContent = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Verificar telefones
  for (const pattern of PHONE_PATTERNS) {
    if (pattern.test(content)) {
      return {
        isBlocked: true,
        reason: 'Número de telefone detectado'
      };
    }
    pattern.lastIndex = 0; // Reset regex
  }
  
  // Verificar emails
  if (EMAIL_PATTERN.test(content)) {
    return {
      isBlocked: true,
      reason: 'Endereço de email detectado'
    };
  }
  EMAIL_PATTERN.lastIndex = 0;
  
  // Verificar links
  for (const pattern of LINK_PATTERNS) {
    if (pattern.test(content)) {
      return {
        isBlocked: true,
        reason: 'Link externo detectado'
      };
    }
    pattern.lastIndex = 0;
  }
  
  // Verificar palavras-chave
  for (const keyword of BLOCKED_KEYWORDS) {
    if (normalizedContent.includes(keyword.toLowerCase())) {
      return {
        isBlocked: true,
        reason: `Termo bloqueado: "${keyword}"`
      };
    }
  }
  
  return {
    isBlocked: false,
    reason: null
  };
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}
