// lib/services.ts — Complete typed API service layer
import api from './api';
import type {
  AuthTokens, Client, LoanApplication, LoanRepayment,
  Expense, ExpenseCategory, DashboardStats, Office,
  Nyongeza, Salary, RecentActivity, PaginatedResponse,
  LoginForm, ClientForm, LoanForm, RepaymentForm,
} from './types';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const AuthService = {
  login:   (data: LoginForm) => api.post<AuthTokens>('/auth/login/', data).then(r => r.data),
  logout:  (refresh: string) => api.post('/auth/logout/', { refresh }).catch(() => {}),
  refresh: (refresh: string) => api.post<{ access: string }>('/auth/refresh/', { refresh }).then(r => r.data),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const DashboardService = {
  getStats: (params?: { office_id?: number; date?: string }) =>
    api.get<DashboardStats>('/dashboard/', { params }).then(r => r.data),
};

// ─── Branches ────────────────────────────────────────────────────────────────
export const BranchService = {
  list:    () => api.get<Office[]>('/my-branches/').then(r => r.data),
  switch:  (office_id: number) => api.post('/switch-branch/', { office_id }).then(r => r.data),
  offices: () => api.get('/offices/').then(r => {
    const d = r.data;
    // Handle both plain array and paginated response
    if (Array.isArray(d)) return d as Office[];
    if (d?.results) return d.results as Office[];
    return [] as Office[];
  }),
};

// ─── Clients ─────────────────────────────────────────────────────────────────
export const ClientService = {
  list: (params?: { page?: number; search?: string; page_size?: number }) =>
    api.get<PaginatedResponse<Client>>('/clients/', { params }).then(r => r.data),
  get:    (id: number) => api.get<Client>(`/clients/${id}/`).then(r => r.data),
  create: (data: ClientForm) => api.post<Client>('/clients/', data).then(r => r.data),
  update: (id: number, data: Partial<ClientForm>) => api.patch<Client>(`/clients/${id}/`, data).then(r => r.data),
  loans:  (clientId: number) => api.get<LoanApplication[]>(`/clients/${clientId}/loans/`).then(r => r.data),
  transferData:    (params?: { search?: string }) =>
    api.get('/transfer-client/data/', { params }).then(r => r.data),
  processTransfer: (payload: { client_id: number; new_office_id: number }) =>
    api.post('/transfer-client/process/', payload).then(r => r.data),
};

// ─── Loans ───────────────────────────────────────────────────────────────────
export const LoanService = {
  list: (params?: { page?: number; search?: string; status?: string; page_size?: number }) =>
    api.get<PaginatedResponse<LoanApplication>>('/loans/', { params }).then(r => r.data),
  get:          (id: number) => api.get<LoanApplication>(`/loans/${id}/`).then(r => r.data),
  create:       (data: LoanForm) => api.post<LoanApplication>('/loans/', data).then(r => r.data),
  repayments:   (loanId: number) => api.get<LoanRepayment[]>(`/loans/${loanId}/repayments/`).then(r => r.data),
  addRepayment: (loanId: number, data: RepaymentForm) =>
    api.post<LoanRepayment>(`/loans/${loanId}/repayments/`, data).then(r => r.data),
  paymentClients: (params?: { search?: string }) =>
    api.get('/loan-payment/clients/', { params }).then(r => r.data),
  receiptClients: (params?: { search?: string }) =>
    api.get('/loan-receipt/clients/', { params }).then(r => r.data),
  receiptList:    (params: { client_id: number | string }) =>
    api.get('/loan-receipt/list/', { params }).then(r => r.data),
  receiptDetail:  (repaymentId: number) =>
    api.get(`/loan-repayment/${repaymentId}/receipt/`).then(r => r.data),
  deleteRepayment:(repaymentId: number) =>
    api.post(`/loan-repayment/${repaymentId}/delete/`).then(r => r.data),
  schedule:     (loanId: number) => api.get(`/loans/${loanId}/schedule/`).then(r => r.data),
  // Reports
  report:       (params?: object) => api.get('/loan-report/', { params }).then(r => r.data),
  completed:    (params?: object) => api.get('/completed-loans/', { params }).then(r => r.data),
  expired:      (params?: object) => api.get('/expired-loans/', { params }).then(r => r.data),
  owedSummary:  (params?: object) => api.get('/loans-owed/', { params }).then(r => r.data),
  owedReport:   (params?: object) => api.get('/loans-owed/report/', { params }).then(r => r.data),
  collection:   (params?: { date_from: string; date_to: string }) =>
    api.get('/loan-collection/', { params }).then(r => r.data),
  issued:       (params?: { date_from: string; date_to: string }) =>
    api.get('/reports/loans-issued/', { params }).then(r => r.data),
  outstanding:  (params?: { client_id?: number }) =>
    api.get('/loan-outstanding/', { params }).then(r => r.data),
};

// ─── Expenses ────────────────────────────────────────────────────────────────
export const ExpenseService = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<Expense>>('/expenses/', { params }).then(r => r.data),
  categories: () => api.get('/expense-categories/').then(r => {
    const d = r.data;
    if (Array.isArray(d)) return d as ExpenseCategory[];
    if (d?.results) return d.results as ExpenseCategory[];
    return [] as ExpenseCategory[];
  }),
  create: (data: {
    description: string; amount: string;
    transaction_type: number; payment_method?: string;
    transaction_date?: string; expense_account?: string;
  }) => api.post<Expense>('/expenses/', data).then(r => r.data),
  statement: (params: { date_from: string; date_to: string }) =>
    api.get('/reports/expenses/', { params }).then(r => r.data),
};

// ─── Salaries ────────────────────────────────────────────────────────────────
export const SalaryService = {
  list:     (params?: { page?: number; month?: string }) =>
    api.get('/salaries/', { params }).then(r => r.data),
  advances: () => api.get('/salary-advances/').then(r => r.data),
  slip:     (params: { month: string }) => api.get('/salary/slip/', { params }).then(r => r.data),
};

// ─── Payroll ─────────────────────────────────────────────────────────────────
export const PayrollService = {
  report: (params: { month: string }) => api.get('/payroll/report/', { params }).then(r => r.data),
  submit: (data: object) => api.post('/payroll/submit/', data).then(r => r.data),
};

// ─── Nyongeza ────────────────────────────────────────────────────────────────
export const NyongezaService = {
  list:   (params?: object) => api.get('/nyongeza/', { params }).then(r => r.data),
  create: (data: { amount: string; deposit_method: string; description?: string }) =>
    api.post('/nyongeza/add/', data).then(r => r.data),
};

// ─── Staff ───────────────────────────────────────────────────────────────────
export const StaffService = {
  list: () => api.get('/staff/').then(r => {
    const d = r.data;
    if (Array.isArray(d)) return d;
    if (d?.results) return d.results;
    return [];
  }),
};

// ─── Office Transactions ─────────────────────────────────────────────────────
export const OfficeTransactionService = {
  list:   (params?: object) => api.get('/office-transactions/', { params }).then(r => r.data),
  create: (data: object) => api.post('/office-transactions/add/', data).then(r => r.data),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const ReportService = {
  monthly:              (params: { month: number; year: number }) =>
    api.get('/reports/monthly/', { params }).then(r => r.data),
  financialStatement:   (params: { date_from: string; date_to: string }) =>
    api.get('/financial-statement/', { params }).then(r => r.data),
  branchFinancial:      (params: { start_date: string; end_date: string }) =>
    api.get('/reports/branch-financial/', { params, timeout: 120000 }).then(r => r.data),
  loansIssued:          (params: { date_from: string; date_to: string }) =>
    api.get('/reports/loans-issued/', { params }).then(r => r.data),
  loansOutstanding:     () => api.get('/reports/loans-outstanding/').then(r => r.data),
  overdueLoans:         () => api.get('/reports/overdue-loans/').then(r => r.data),
  expenses:             (params: { date_from: string; date_to: string }) =>
    api.get('/reports/expenses/', { params }).then(r => r.data),
  monthlyRepayment:     (params: { month_from: string; month_to: string }) =>
    api.get('/monthly-repayment/', { params }).then(r => r.data),
  monthlyOutstanding:   (params: { month: string }) =>
    api.get('/monthly-outstanding/', { params }).then(r => r.data),
  expiredLoans:         () => api.get('/expired-loans/').then(r => r.data),
  transactionStatement: (params: { date_from: string; date_to: string }) =>
    api.get('/branch-transactions/', { params }).then(r => r.data),
  customerStatement:    (params: { client_id: number }) =>
    api.get('/customer-statement/', { params }).then(r => r.data),
  loanCollection:       (params: { date_from: string; date_to: string }) =>
    api.get('/loan-collection/', { params }).then(r => r.data),
  bankCharges:          (params: { date_from: string; date_to: string }) =>
    api.get('/reports/bank-charges/', { params }).then(r => r.data),
  addBankCharge:        (payload: {
    description: string;
    amount: string;               // numeric string, no commas
    payment_method: 'cash' | 'bank';
    transaction_date: string;     // YYYY-MM-DD
  }) => api.post('/bank-charges/add/', payload).then(r => r.data),
  hqFinancialStatement: (params: { date_from: string; date_to: string }) =>
    api.get('/reports/hq-financial/', { params }).then(r => r.data),
  bankTransferExpenses: (params: { date_from: string; date_to: string }) =>
    api.get('/reports/bank-transfer-expenses/', { params }).then(r => r.data),
  salarySlip:           (params: { month: string }) =>
    api.get('/salary/slip/', { params }).then(r => r.data),
  balanceSheet:         (params: { as_of_date: string }) =>
    api.get('/reports/balance-sheet/', { params }).then(r => r.data),
  trialBalance:         (params: { start_date: string; end_date: string }) =>
    api.get('/reports/trial-balance/', { params }).then(r => r.data),
};

// ─── Recent Activity ─────────────────────────────────────────────────────────
export const ActivityService = {
  list: () => api.get<RecentActivity[]>('/recent-activity/').then(r => r.data),
};
