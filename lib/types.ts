// lib/types.ts
// Mirror of Django models → TypeScript interfaces

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  employee_id: string;
  role: string;
  is_superuser: boolean;
  is_active: boolean;
  office: string;        // office name
  office_name: string;
  office_id: number | null;
  branch: string;
  branch_id: number | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

export interface Office {
  id: number;
  name: string;
  region: string;
  district: string;
  ward?: string;
  street?: string;
  founded_date?: string;
  selected?: boolean;
}

export interface Client {
  id: number;
  full_name: string;
  firstname: string;
  middlename: string;
  lastname: string;
  phonenumber: string | null;
  date_of_birth: string | null;
  marital_status: string | null;
  employername: string | null;
  idara: string | null;
  kaziyako: string | null;
  employmentcardno: string | null;
  region: string | null;
  district: string | null;
  street: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_number: string | null;
  account_name: string | null;
  registered_date: string;
  registered_office_name: string | null;
}

export interface LoanRepayment {
  id: number;
  repayment_amount: string;
  repayment_date: string | null;
  transaction_method: string | null;
  payment_month: string | null;
  created_at: string | null;
}

export interface LoanApplication {
  id: number;
  client: number;
  client_name: string;
  client_phone: string;
  loan_amount: string;
  loan_purpose: string | null;
  loan_type: string;
  interest_rate: string;
  payment_period_months: number;
  application_date: string;
  status: string;
  monthly_installment: string | null;
  interest_amount: string | null;
  total_interest_amount: string | null;
  total_repayment_amount: string | null;
  first_repayment_date: string | null;
  repayment_amount_remaining: string;
  office: string | null;
  transaction_method: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  repayments: LoanRepayment[];
  repayment_count: number;
  amount_paid: string | number;
}

export interface Expense {
  id: number;
  description: string;
  amount: string;
  expense_date: string;
  office: string | null;
  category_name: string | null;
  expense_account: string | null;
  payment_method: string | null;
  transaction_date: string | null;
  created_at: string | null;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  created_at: string;
}

export interface DashboardStats {
  total_clients: number;
  total_active_loans: number;
  total_loan_amount: string;
  total_outstanding: string;
  total_repaid: string;
  new_clients_this_month: number;
  loans_this_month: number;
  expenses_this_month: string;
}

export interface Salary {
  id: number;
  employee_name: string;
  amount: string;
  salary_for_month: string;
  transaction_method: string | null;
  payment_date: string;
}

export interface Nyongeza {
  id: number;
  description: string;
  amount: string;
  deposit_method: string | null;
  date: string;
  recorded_by_name: string;
}

export interface RecentActivity {
  type: 'loan' | 'repayment' | 'client' | 'expense';
  description: string;
  amount?: string;
  date: string;
  office?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

// Form types
export interface LoginForm {
  username: string;
  password: string;
}

export interface ClientForm {
  firstname: string;
  middlename: string;
  lastname: string;
  phonenumber?: string;
  employername?: string;
  idara?: string;
  kaziyako?: string;
  region?: string;
  district?: string;
  bank_name?: string;
  bank_account_number?: string;
  account_name?: string;
}

export interface LoanForm {
  client: number;
  loan_amount: string;
  loan_type: string;
  interest_rate: string;
  payment_period_months: string;
  loan_purpose?: string;
  transaction_method?: string;
}

export interface RepaymentForm {
  repayment_amount: string;
  transaction_method: string;
  repayment_date?: string;
}
