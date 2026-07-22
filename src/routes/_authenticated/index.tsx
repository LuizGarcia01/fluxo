import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Header } from "@/components/dashboard/Header";
import { TotalCards } from "@/components/dashboard/TotalCards";
import { TransactionTable, type TransactionFilter } from "@/components/dashboard/TransactionTable";
import { Charts } from "@/components/dashboard/Charts";
import { AddTransactionDialog } from "@/components/dashboard/AddTransactionDialog";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { InvestmentManager } from "@/components/dashboard/InvestmentManager";

import {
  getCategories,
  getTransactions,
  getMonthlySummary,
  getMonthlyComparison,
  getCategorySpending,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createCategory,
  updateCategory,
  deleteCategory,
  getInvestments,
  getContributions,
  getInvestmentSummary,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  createContribution,
  deleteContribution,
} from "@/lib/budget.functions";
import type { Transaction, TransactionType, ExpenseKind, InvestmentType } from "@/lib/budget.types";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
});

function DashboardPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [currentDate, setCurrentDate] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories({ data: undefined }),
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions", currentDate.year, currentDate.month],
    queryFn: () => getTransactions({ data: { year: currentDate.year, month: currentDate.month } }),
  });

  const summaryQuery = useQuery({
    queryKey: ["summary", currentDate.year, currentDate.month],
    queryFn: () => getMonthlySummary({ data: { year: currentDate.year, month: currentDate.month } }),
  });

  const comparisonQuery = useQuery({
    queryKey: ["comparison", currentDate.year, currentDate.month],
    queryFn: () => getMonthlyComparison({ data: { year: currentDate.year, month: currentDate.month } }),
  });

  const spendingQuery = useQuery({
    queryKey: ["spending", currentDate.year, currentDate.month],
    queryFn: () => getCategorySpending({ data: { year: currentDate.year, month: currentDate.month } }),
  });

  const investmentsQuery = useQuery({
    queryKey: ["investments"],
    queryFn: () => getInvestments({ data: undefined }),
  });

  const contributionsQuery = useQuery({
    queryKey: ["contributions", currentDate.year, currentDate.month],
    queryFn: () => getContributions({ data: { year: currentDate.year, month: currentDate.month } }),
  });

  const invSummaryQuery = useQuery({
    queryKey: ["invSummary", currentDate.year, currentDate.month],
    queryFn: () => getInvestmentSummary({ data: { year: currentDate.year, month: currentDate.month } }),
  });

  const isPending =
    categoriesQuery.isPending ||
    transactionsQuery.isPending ||
    summaryQuery.isPending ||
    comparisonQuery.isPending ||
    spendingQuery.isPending ||
    investmentsQuery.isPending ||
    contributionsQuery.isPending ||
    invSummaryQuery.isPending;

  const isError =
    categoriesQuery.isError ||
    transactionsQuery.isError ||
    summaryQuery.isError ||
    comparisonQuery.isError ||
    spendingQuery.isError ||
    investmentsQuery.isError ||
    contributionsQuery.isError ||
    invSummaryQuery.isError;

  const invalidateMonth = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions", currentDate.year, currentDate.month] });
    queryClient.invalidateQueries({ queryKey: ["summary", currentDate.year, currentDate.month] });
    queryClient.invalidateQueries({ queryKey: ["comparison", currentDate.year, currentDate.month] });
    queryClient.invalidateQueries({ queryKey: ["spending", currentDate.year, currentDate.month] });
    queryClient.invalidateQueries({ queryKey: ["invSummary", currentDate.year, currentDate.month] });
    queryClient.invalidateQueries({ queryKey: ["contributions", currentDate.year, currentDate.month] });
  };

  const handleAddTransaction = async (data: {
    type: TransactionType;
    categoryId: string | null;
    amount: number;
    description: string;
    date: string;
  }) => {
    try {
      await createTransaction({ data });
      invalidateMonth();
      toast.success("Lançamento adicionado!");
    } catch {
      toast.error("Erro ao adicionar lançamento.");
      throw new Error("failed");
    }
  };

  const handleEditTransaction = async (data: {
    type: TransactionType;
    categoryId: string | null;
    amount: number;
    description: string;
    date: string;
  }) => {
    if (!editingTransaction) return;
    try {
      await updateTransaction({ data: { id: editingTransaction.id, ...data } });
      invalidateMonth();
      setEditingTransaction(null);
      toast.success("Lançamento atualizado!");
    } catch {
      toast.error("Erro ao atualizar lançamento.");
      throw new Error("failed");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction({ data: { id } });
      invalidateMonth();
      toast.success("Lançamento excluído.");
    } catch {
      toast.error("Erro ao excluir lançamento.");
    }
  };

  const handleAddCategory = async (data: { name: string; type: TransactionType; expense_kind: ExpenseKind | null }) => {
    try {
      await createCategory({ data });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      invalidateMonth();
      toast.success("Categoria criada!");
    } catch {
      toast.error("Erro ao criar categoria.");
    }
  };

  const handleUpdateCategory = async (data: { id: string; name: string; type: TransactionType; expense_kind: ExpenseKind | null }) => {
    try {
      await updateCategory({ data });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      invalidateMonth();
      toast.success("Categoria atualizada!");
    } catch {
      toast.error("Erro ao atualizar categoria.");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory({ data: { id } });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      invalidateMonth();
      toast.success("Categoria excluída.");
    } catch {
      toast.error("Erro ao excluir categoria.");
    }
  };

  const handleAddInvestment = async (data: { name: string; type: InvestmentType; current_value: number }) => {
    try {
      await createInvestment({ data });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["invSummary", currentDate.year, currentDate.month] });
      toast.success("Investimento adicionado!");
    } catch {
      toast.error("Erro ao adicionar investimento.");
    }
  };

  const handleUpdateInvestment = async (data: { id: string; name: string; type: InvestmentType; current_value: number }) => {
    try {
      await updateInvestment({ data });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["invSummary", currentDate.year, currentDate.month] });
      toast.success("Investimento atualizado!");
    } catch {
      toast.error("Erro ao atualizar investimento.");
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    try {
      await deleteInvestment({ data: { id } });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["invSummary", currentDate.year, currentDate.month] });
      queryClient.invalidateQueries({ queryKey: ["contributions", currentDate.year, currentDate.month] });
      toast.success("Investimento excluído.");
    } catch {
      toast.error("Erro ao excluir investimento.");
    }
  };

  const handleAddContribution = async (data: {
    investment_id: string;
    amount: number;
    date: string;
    notes: string | null;
    linkToCashflow: boolean;
  }) => {
    try {
      await createContribution({ data });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      invalidateMonth();
      toast.success("Aporte registrado!");
    } catch {
      toast.error("Erro ao registrar aporte.");
    }
  };

  const handleDeleteContribution = async (id: string) => {
    try {
      await deleteContribution({ data: { id } });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      invalidateMonth();
      toast.success("Aporte excluído.");
    } catch {
      toast.error("Erro ao excluir aporte.");
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-xl bg-brand flex items-center justify-center shadow-sm shadow-brand/30">
            <span className="text-white text-xs font-bold">₢</span>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    const firstError =
      categoriesQuery.error || transactionsQuery.error || summaryQuery.error ||
      comparisonQuery.error || spendingQuery.error || investmentsQuery.error ||
      contributionsQuery.error || invSummaryQuery.error;
    const errorMessage = firstError instanceof Error ? firstError.message : String(firstError ?? "");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-lg font-heading font-bold text-foreground">Erro ao carregar dados</h2>
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar suas informações. Tente recarregar a página.
          </p>
          {errorMessage && (
            <pre className="text-xs text-left bg-surface border border-border p-3 rounded-xl overflow-auto max-h-40 text-muted-foreground">
              {errorMessage}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity shadow-sm shadow-brand/30"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  const categories = categoriesQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const summary = summaryQuery.data ?? { totalIncome: 0, totalExpense: 0, totalFixedExpense: 0, totalVariableExpense: 0, balance: 0 };
  const comparison = comparisonQuery.data ?? [];
  const spending = spendingQuery.data ?? [];
  const investments = investmentsQuery.data ?? [];
  const contributions = contributionsQuery.data ?? [];
  const invSummary = invSummaryQuery.data ?? { totalPatrimony: 0, monthContributions: 0, savingsRate: 0, allocation: [] };

  return (
    <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header currentDate={currentDate} onChangeDate={setCurrentDate} />

        <TotalCards summary={summary} investments={invSummary} />

        <div className="flex flex-wrap items-center gap-3">
          <AddTransactionDialog
            categories={categories}
            currentDate={currentDate}
            onSubmit={handleAddTransaction}
          />
          <CategoryManager
            categories={categories}
            onAdd={handleAddCategory}
            onUpdate={handleUpdateCategory}
            onDelete={handleDeleteCategory}
          />
        </div>

        {/* Edit dialog — mounts when editingTransaction is set */}
        {editingTransaction && (
          <AddTransactionDialog
            categories={categories}
            currentDate={currentDate}
            onSubmit={handleEditTransaction}
            editingTransaction={editingTransaction}
            onClose={() => setEditingTransaction(null)}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <TransactionTable
            transactions={transactions}
            filter={filter}
            onFilterChange={setFilter}
            onDelete={handleDeleteTransaction}
            onEdit={setEditingTransaction}
            investmentsSlot={
              <InvestmentManager
                inline
                investments={investments}
                contributions={contributions}
                onAddInvestment={handleAddInvestment}
                onUpdateInvestment={handleUpdateInvestment}
                onDeleteInvestment={handleDeleteInvestment}
                onAddContribution={handleAddContribution}
                onDeleteContribution={handleDeleteContribution}
              />
            }
          />
          <Charts monthlyComparison={comparison} categorySpending={spending} investments={invSummary} />
        </div>
      </div>
    </div>
  );
}

