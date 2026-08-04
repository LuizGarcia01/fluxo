export type TransactionType = "income" | "expense";
export type ExpenseKind = "fixed" | "variable";
export type InvestmentType = "renda_fixa" | "acoes" | "fii" | "cripto" | "outros";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  expense_kind: ExpenseKind | null; // null only for income categories
  color: string | null;
  icon: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  category_id: string | null;
  amount: number;
  description: string;
  date: string;
  bill_id: string | null;
  created_by: string | null;
  created_at: string;
  category?: Category | null;
}

export interface HouseholdMember {
  userId: string;
  displayName: string;
  color: string;
  initials: string;
}

export interface HouseholdInfo {
  status: "solo" | "owner" | "member";
  me: HouseholdMember;
  partner?: HouseholdMember;
  pendingInvite?: { token: string; expiresAt: string };
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  totalFixedExpense: number;
  totalVariableExpense: number;
  balance: number;
}

export interface CategorySpending {
  category: Category;
  amount: number;
  percentage: number;
}

export interface Investment {
  id: string;
  user_id: string;
  name: string;
  type: InvestmentType;
  current_value: number;
  created_at: string;
  updated_at: string;
}

export interface InvestmentContribution {
  id: string;
  user_id: string;
  investment_id: string;
  amount: number; // positive = aporte, negative = retirada
  date: string;
  notes: string | null;
  transaction_id: string | null;
  created_at: string;
  investment?: Investment | null;
}

export interface InvestmentSummary {
  totalPatrimony: number;
  monthContributions: number; // net (aportes - retiradas) do mês
  savingsRate: number; // % da renda do mês investida
  allocation: { type: InvestmentType; amount: number; percentage: number }[];
}

export interface BillTemplate {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category_id: string | null;
  due_day: number;
  is_active: boolean;
  is_installment: boolean;
  installment_total: number | null;
  installment_current: number | null;
  installment_group_id: string | null;
  installment_month: number | null;
  installment_year: number | null;
  created_at: string;
  category?: Category | null;
}

export interface BillWithStatus extends BillTemplate {
  paid_transaction_id: string | null;
  is_overdue: boolean;
}
