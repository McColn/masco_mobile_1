// hooks/useOffices.ts
// Shared hook — loads offices once, reused across all screens that need them
import { useQuery } from '@tanstack/react-query';
import { BranchService } from '@/lib/services';
import type { Office } from '@/lib/types';

export function useOffices() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['offices-list'],
    queryFn: async () => {
      const result = await BranchService.offices();
      // Extra safety — handle any response shape
      if (Array.isArray(result)) return result as Office[];
      const r = result as any;
      if (r?.results && Array.isArray(r.results)) return r.results as Office[];
      if (r?.data && Array.isArray(r.data)) return r.data as Office[];
      return [] as Office[];
    },
    staleTime: 5 * 60 * 1000,   // 5 min — offices rarely change
    retry: 1,
  });

  return {
    offices: (data ?? []) as Office[],
    isLoading,
    isError,
    refetch,
  };
}
