/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/` | `/(tabs)` | `/(tabs)/` | `/(tabs)/clients` | `/(tabs)/expenses` | `/(tabs)/loans` | `/(tabs)/profile` | `/_sitemap` | `/branch/bank-charge-new` | `/branch/clients` | `/branch/customer-loans` | `/branch/customer-statement` | `/branch/loan-calculator` | `/branch/loan-payment` | `/branch/office-transaction` | `/branch/payment-receipts` | `/branch/plan-calculator` | `/branch/receipt` | `/branch/reports/approve-completed` | `/branch/reports/bank-charges` | `/branch/reports/bank-transfer` | `/branch/reports/completed-customers` | `/branch/reports/edit-repayment` | `/branch/reports/expenses-statement` | `/branch/reports/expired-loans` | `/branch/reports/financial-statement` | `/branch/reports/loan-collection` | `/branch/reports/loans-issued` | `/branch/reports/loans-owed` | `/branch/reports/loans-report` | `/branch/reports/money-transfer` | `/branch/reports/monthly-repayment` | `/branch/reports/repayment-schedule` | `/branch/reports/transaction-statement` | `/clients` | `/clients/new` | `/expenses` | `/expenses/new` | `/hq/block-user` | `/hq/blocked-staff` | `/hq/expense-categories` | `/hq/manage-branches` | `/hq/nyongeza` | `/hq/office` | `/hq/office-transactions` | `/hq/payroll` | `/hq/reports/bank-transfer-expenses` | `/hq/reports/customer-report` | `/hq/reports/detail/expenses` | `/hq/reports/detail/loans` | `/hq/reports/detail/repayments` | `/hq/reports/detail/transactions` | `/hq/reports/expenses-statement` | `/hq/reports/expired-loans` | `/hq/reports/financial-statement` | `/hq/reports/hq-financial-statement` | `/hq/reports/hq-transfer-expenses` | `/hq/reports/loans-issued` | `/hq/reports/loans-owed` | `/hq/reports/repayment-scheduled` | `/hq/reports/salary-slip` | `/hq/roles` | `/hq/salary` | `/hq/salary-advance` | `/hq/staff` | `/hq/transfer-client` | `/hq/transfer-staff` | `/loans` | `/loans/new` | `/profile` | `/reports` | `/reports/balance-sheet` | `/reports/trial-balance` | `/salaries`;
      DynamicRoutes: `/clients/${Router.SingleRoutePart<T>}` | `/loans/${Router.SingleRoutePart<T>}` | `/loans/edit/${Router.SingleRoutePart<T>}` | `/receipts/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/clients/[id]` | `/loans/[id]` | `/loans/edit/[id]` | `/receipts/[id]`;
    }
  }
}
