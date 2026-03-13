import { useState, useCallback } from 'react';

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface UsePaginatedQueryReturn<T> {
  data: T[];
  pagination: PaginationState;
  loading: boolean;
  setPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  refetch: () => void;
}

export function usePaginationState(initialPerPage = 20) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPageState] = useState(initialPerPage);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const offset = (currentPage - 1) * itemsPerPage;

  const setPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages || 1)));
  }, [totalPages]);

  const setItemsPerPage = useCallback((items: number) => {
    setItemsPerPageState(items);
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    offset,
    setPage,
    setItemsPerPage,
    setTotalItems,
  };
}
