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
  created_at: string;
  category?: Category | null;
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
