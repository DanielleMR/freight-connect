import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (items: number) => void;
  itemsPerPageOptions?: number[];
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100]
}: AdminPaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (totalPages <= 1 && !onItemsPerPageChange) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Mostrando {startItem}-{endItem} de {totalItems}
        </span>
        
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span>Itens por página:</span>
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(v) => onItemsPerPageChange(parseInt(v))}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemsPerPageOptions.map(opt => (
                  <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            
            {getVisiblePages().map((page, idx) => (
              <PaginationItem key={idx}>
                {page === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    isActive={page === currentPage}
                    onClick={() => onPageChange(page)}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
