import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1 * 60 * 1000,   // 1 min — was 2 min
      gcTime:               2 * 60 * 1000,   // 2 min — was 10 min (was keeping all data in heap)
      retry:                0,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const QK = {
  dashboard: (officeId?: number) => ['dashboard', officeId] as const,
  clients: (officeId?: number, search?: string) => ['clients', officeId, search] as const,
  client: (id: number) => ['client', id] as const,
  loans: (officeId?: number, status?: string, search?: string) => ['loans', officeId, status, search] as const,
  loan: (id: number) => ['loan', id] as const,
  clientLoans: (clientId: number) => ['client-loans', clientId] as const,
  loanRepayments: (id: number) => ['loan-repayments', id] as const,
  loanSchedule: (id: number) => ['loan-schedule', id] as const,
  expenses: (officeId?: number) => ['expenses', officeId] as const,
  expenseCategories: ['expense-categories'] as const,
  salaries: (params?: object) => ['salaries', params] as const,
  branches: ['branches'] as const,
  nyongeza: (officeId?: number) => ['nyongeza', officeId] as const,
  reports: {
    monthly: (month: number, year: number, officeId?: number) => ['reports', 'monthly', month, year, officeId] as const,
    loansIssued: (params: object) => ['reports', 'loans-issued', params] as const,
    financial: (params: object) => ['reports', 'financial', params] as const,
  },
};
