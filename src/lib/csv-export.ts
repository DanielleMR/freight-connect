/**
 * Utilitário para exportação CSV
 */

interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | null | undefined);
}

/**
 * Exporta dados para CSV
 * @param data - Array de objetos com os dados
 * @param columnsOrFilename - Colunas de exportação OU nome do arquivo (para formato simples)
 * @param filename - Nome do arquivo (opcional se columnsOrFilename for string)
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columnsOrFilename: ExportColumn<T>[] | string,
  filename?: string
): void {
  if (data.length === 0) {
    alert('Nenhum dado para exportar');
    return;
  }

  let headers: string;
  let rows: string[];

  // Formato simples: data é um array de objetos chave-valor
  if (typeof columnsOrFilename === 'string') {
    const keys = Object.keys(data[0]);
    headers = keys.map(key => `"${key}"`).join(';');
    rows = data.map(row => {
      return keys.map(key => {
        const value = row[key];
        if (value === null || value === undefined || value === '-') {
          return '""';
        }
        if (typeof value === 'number') {
          return value.toString().replace('.', ',');
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(';');
    });
    filename = columnsOrFilename;
  } else {
    // Formato com colunas explícitas
    const columns = columnsOrFilename;
    headers = columns.map(col => `"${col.header}"`).join(';');
    rows = data.map(row => {
      return columns.map(col => {
        let value: string | number | null | undefined;
        
        if (typeof col.accessor === 'function') {
          value = col.accessor(row);
        } else {
          value = row[col.accessor];
        }

        if (value === null || value === undefined) {
          return '""';
        }
        if (typeof value === 'number') {
          return value.toString().replace('.', ',');
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(';');
    });
  }

  // Criar conteúdo CSV com BOM para Excel
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers, ...rows].join('\n');

  // Criar blob e download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Formatadores comuns
export const formatters = {
  date: (value: string | null) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('pt-BR');
  },
  
  datetime: (value: string | null) => {
    if (!value) return '';
    return new Date(value).toLocaleString('pt-BR');
  },
  
  currency: (value: number | null) => {
    if (value === null || value === undefined) return '';
    return value.toFixed(2);
  },
  
  boolean: (value: boolean | null) => {
    if (value === null || value === undefined) return '';
    return value ? 'Sim' : 'Não';
  }
};
