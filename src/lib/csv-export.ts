/**
 * Utilitário para exportação CSV
 */

interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | null | undefined);
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  if (data.length === 0) {
    alert('Nenhum dado para exportar');
    return;
  }

  // Gerar cabeçalho
  const headers = columns.map(col => `"${col.header}"`).join(';');

  // Gerar linhas
  const rows = data.map(row => {
    return columns.map(col => {
      let value: string | number | null | undefined;
      
      if (typeof col.accessor === 'function') {
        value = col.accessor(row);
      } else {
        value = row[col.accessor];
      }

      // Formatar valor
      if (value === null || value === undefined) {
        return '""';
      }
      if (typeof value === 'number') {
        return value.toString().replace('.', ',');
      }
      // Escapar aspas e envolver em aspas
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(';');
  });

  // Criar conteúdo CSV com BOM para Excel
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers, ...rows].join('\n');

  // Criar blob e download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
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
