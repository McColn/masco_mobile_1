// lib/navigation.ts
// Full menu structure mirroring the HTML django nav exactly

export interface NavItem {
  key: string;
  label: string;
  icon: string;          // emoji icon
  route?: string;        // if it's a direct link
  children?: NavChild[];
}

export interface NavChild {
  key: string;
  label: string;
  icon: string;
  route: string;
}

// ─── HQ Menu (is_hq_selected = true) ────────────────────────────────────────
export const HQ_NAV: NavItem[] = [
  {
    key: 'home',
    label: 'Home',
    icon: '🏠',
    route: '/(tabs)/',
  },
  {
    key: 'registrations',
    label: 'Registrations',
    icon: '👤',
    children: [
      { key: 'staff',           label: 'Register Staff',             icon: '👔', route: '/hq/staff' },
      { key: 'office',          label: 'Register Office Account',    icon: '🏢', route: '/hq/office' },
      { key: 'expense_cat',     label: 'Office Expenses Registration',icon: '🏢', route: '/hq/expense-categories' },
      { key: 'staff_salary',    label: 'Staff Salary',               icon: '💰', route: '/hq/salary' },
      { key: 'salary_advance',  label: 'Staff Specific Deduction',   icon: '💰', route: '/hq/salary-advance' },
      { key: 'nyongeza',        label: 'Capital',                    icon: '📊', route: '/hq/nyongeza' },
      { key: 'transfer_staff',  label: 'Transfer Staff',             icon: '🔄', route: '/hq/transfer-staff' },
      { key: 'transfer_client', label: 'Transfer Client',            icon: '🔄', route: '/hq/transfer-client' },
      { key: 'manage_branches', label: 'Manage Staff Branch',        icon: '🏷️', route: '/hq/manage-branches' },
      { key: 'block_user',      label: 'Block User',                 icon: '🚫', route: '/hq/block-user' },
      { key: 'blocked_staff',   label: 'Blocked Staff',              icon: '👤', route: '/hq/blocked-staff' },
      { key: 'roles',           label: 'Role & Permissions',         icon: '🛡️', route: '/hq/roles' },
    ],
  },
  {
    key: 'transaction',
    label: 'Transaction',
    icon: '💱',
    children: [
      { key: 'office_tx',  label: 'Office Transaction',  icon: '💳', route: '/hq/office-transactions' },
      { key: 'payroll',    label: 'Salary Payment',       icon: '💳', route: '/hq/payroll' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: '📋',
    children: [
      { key: 'loans_issued',      label: 'Loans Issued',              icon: '💵', route: '/hq/reports/loans-issued' },
      { key: 'loans_owed',        label: 'Loans Owed',                icon: '📄', route: '/hq/reports/loans-owed' },
      { key: 'repayment_sched',   label: 'Repayment Scheduled',       icon: '📄', route: '/hq/reports/repayment-scheduled' },
      { key: 'expired_loan',      label: 'Expired Loan',              icon: '⚠️', route: '/hq/reports/expired-loans' },
      { key: 'hq_transfer_exp',   label: 'HQ Transfer Expenses',      icon: '💳', route: '/hq/reports/hq-transfer-expenses' },
      { key: 'bank_transfer_exp', label: 'Bank Transfer Expenses',    icon: '💳', route: '/hq/reports/bank-transfer-expenses' },
      { key: 'expenses_stmt',     label: 'Expenses Statement',        icon: '📄', route: '/hq/reports/expenses-statement' },
      { key: 'hq_fin_stmt',       label: 'HQ Financial Statement',    icon: '⚖️', route: '/hq/reports/hq-financial-statement' },
      { key: 'fin_stmt',          label: 'Financial Statement',       icon: '📈', route: '/hq/reports/financial-statement' },
      { key: 'balance_sheet',     label: 'Balance Sheet',             icon: '⚖️', route: '/reports/balance-sheet' },
      { key: 'trial_balance',     label: 'Trial Balance',             icon: '🧮', route: '/reports/trial-balance' },
      { key: 'salary_slip',       label: 'Salary Slip',               icon: '🧾', route: '/hq/reports/salary-slip' },
      { key: 'customer_report',   label: 'Customer Report',           icon: '🧾', route: '/hq/reports/customer-report' },
    ],
  },
];

// ─── Branch Menu (is_hq_selected = false) ────────────────────────────────────
export const BRANCH_NAV: NavItem[] = [
  {
    key: 'home',
    label: 'Home',
    icon: '🏠',
    route: '/(tabs)/',
  },
  {
    key: 'loan_applications',
    label: 'Loan Applications',
    icon: '📝',
    children: [
      { key: 'plan_calc', label: 'Customer Plan Calculator', icon: '🧮', route: '/branch/plan-calculator' },
      { key: 'loan_calc', label: 'Loan Calculator',          icon: '🪙', route: '/branch/loan-calculator' },
      { key: 'clients',   label: 'Process Loans',            icon: '💵', route: '/branch/clients' },
    ],
  },
  {
    key: 'transaction',
    label: 'Transaction',
    icon: '💱',
    children: [
      { key: 'loan_payment',   label: 'Loan Payment',      icon: '🏦', route: '/branch/loan-payment' },
      { key: 'payment_receipt',label: 'Payment Receipts',  icon: '🧾', route: '/branch/payment-receipts' },
      { key: 'office_tx_page', label: 'Office Transaction', icon: '🏦', route: '/branch/office-transaction' },
      { key: 'bank_charge_add',label: 'Bank Charges',       icon: '💳', route: '/branch/bank-charge-new' },
    ],
  },
  {
    key: 'customer_report',
    label: 'Customer Report',
    icon: '📈',
    children: [
      { key: 'payment_receipt_cr', label: 'Payment Receipts',       icon: '🧾', route: '/branch/payment-receipts' },
      { key: 'customer_loans_rpt', label: 'Customer Loans Report',  icon: '📄', route: '/branch/customer-loans' },
      { key: 'customer_stmt',      label: 'Customer Statement',     icon: '📄', route: '/branch/customer-statement' },
    ],
  },
  {
    key: 'office_reports',
    label: 'Office Reports',
    icon: '📊',
    children: [
      { key: 'tx_statement',     label: 'Transaction Statement',       icon: '📄', route: '/branch/reports/transaction-statement' },
      { key: 'loan_collection',  label: 'Loans Collection Statement',  icon: '💵', route: '/branch/reports/loan-collection' },
      { key: 'bank_transfer',    label: 'Bank Transfer Expenses',      icon: '🏦', route: '/branch/reports/bank-transfer' },
      { key: 'money_transfer',   label: 'Money Transfer Statement',    icon: '💱', route: '/branch/reports/money-transfer' },
      { key: 'loans_issued',     label: 'Loans Issued',               icon: '💳', route: '/branch/reports/loans-issued' },
      { key: 'loans_report',     label: 'Loans Report',               icon: '📄', route: '/branch/reports/loans-report' },
      { key: 'completed_cust',   label: 'Completed Customers',        icon: '📄', route: '/branch/reports/completed-customers' },
      { key: 'expired_loans',    label: 'Expired Loans',              icon: '⏳', route: '/branch/reports/expired-loans' },
      { key: 'loans_owed',       label: 'Loans Owed',                 icon: '❗', route: '/branch/reports/loans-owed' },
      { key: 'approve_completed',label: 'Approve Completed Loans',    icon: '❗', route: '/branch/reports/approve-completed' },
      { key: 'repayment_sched',  label: 'Repayment Schedule',         icon: '📅', route: '/branch/reports/repayment-schedule' },
      { key: 'expenses_stmt',    label: 'Expenses Statement',         icon: '🧾', route: '/branch/reports/expenses-statement' },
      { key: 'bank_charges',     label: 'Bank Charges Statement',     icon: '🧾', route: '/branch/reports/bank-charges' },
      { key: 'financial_stmt',   label: 'Financial Statement',        icon: '⚖️', route: '/branch/reports/financial-statement' },
      { key: 'balance_sheet',    label: 'Balance Sheet',              icon: '⚖️', route: '/reports/balance-sheet' },
      { key: 'trial_balance',    label: 'Trial Balance',              icon: '🧮', route: '/reports/trial-balance' },
      { key: 'monthly_repay',    label: 'Monthly-Wise Repayment',     icon: '📆', route: '/branch/reports/monthly-repayment' },
    ],
  },
];
