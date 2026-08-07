import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { toast } from "sonner";
import { Home, CalendarDays, TrendingUp, Settings, Moon, Sun, LogOut, Plus, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";

import { NexoLogo, NexoMark } from "@/components/dashboard/NexoLogo";
import { CurrencyProvider, useCurrency } from "@/contexts/CurrencyContext";
import { TotalCards } from "@/components/dashboard/TotalCards";
import { Charts } from "@/components/dashboard/Charts";
import { AddTransactionDialog } from "@/components/dashboard/AddTransactionDialog";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { InvestmentManager } from "@/components/dashboard/InvestmentManager";
import { BillsSection } from "@/components/dashboard/BillsSection";
import { NotificationSettings } from "@/components/dashboard/NotificationSettings";
import { AgendaView } from "@/components/dashboard/AgendaView";
import { HouseholdSettings } from "@/components/dashboard/HouseholdSettings";
import { UserAvatar } from "@/components/dashboard/UserAvatar";

import {
  getCategories,
  getTransactions,
  createInstallmentTransactions,
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
  getBills,
  createBill,
  createInstallmentBills,
  updateBill,
  deleteBill,
  deleteInstallmentGroup,
  payBill,
  unpayBill,
  getHouseholdInfo,
} from "@/lib/budget.functions";
import { supabase } from "@/integrations/supabase/client";
import type { Transaction, TransactionType, ExpenseKind, InvestmentType } from "@/lib/budget.types";

export const Route = createFileRoute("/_authenticated/")({
  component: () => (
    <CurrencyProvider>
      <DashboardPage />
    </CurrencyProvider>
  ),
});

type Tab = "inicio" | "agenda" | "investir" | "config";

const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function DashboardPage() {
  const queryClient = useQueryClient();
  const { daysLeft } = useRouteContext({ from: "/_authenticated" });
  const now = new Date();
  const [currentDate, setCurrentDate] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [activeTab, setActiveTab] = useState<Tab>("inicio");
  const [showAdd, setShowAdd] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("nexo-theme", next ? "dark" : "light");
  };

  const prevMonth = () => {
    setCurrentDate((d) => {
      if (d.month === 1) return { year: d.year - 1, month: 12 };
      return { ...d, month: d.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentDate((d) => {
      if (d.month === 12) return { year: d.year + 1, month: 1 };
      return { ...d, month: d.month + 1 };
    });
  };

  // ── Queries ──
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: () => getCategories({ data: undefined }) });
  const transactionsQuery = useQuery({ queryKey: ["transactions", currentDate.year, currentDate.month], queryFn: () => getTransactions({ data: currentDate }) });
  const summaryQuery = useQuery({ queryKey: ["summary", currentDate.year, currentDate.month], queryFn: () => getMonthlySummary({ data: currentDate }) });
  const comparisonQuery = useQuery({ queryKey: ["comparison", currentDate.year, currentDate.month], queryFn: () => getMonthlyComparison({ data: currentDate }) });
  const spendingQuery = useQuery({ queryKey: ["spending", currentDate.year, currentDate.month], queryFn: () => getCategorySpending({ data: currentDate }) });
  const investmentsQuery = useQuery({ queryKey: ["investments"], queryFn: () => getInvestments({ data: undefined }) });
  const contributionsQuery = useQuery({ queryKey: ["contributions", currentDate.year, currentDate.month], queryFn: () => getContributions({ data: currentDate }) });
  const invSummaryQuery = useQuery({ queryKey: ["invSummary", currentDate.year, currentDate.month], queryFn: () => getInvestmentSummary({ data: currentDate }) });
  const billsQuery = useQuery({ queryKey: ["bills", currentDate.year, currentDate.month], queryFn: () => getBills({ data: currentDate }) });
  const householdQuery = useQuery({ queryKey: ["household"], queryFn: () => getHouseholdInfo({ data: undefined }), staleTime: 60_000 });

  const isPending =
    categoriesQuery.isPending || transactionsQuery.isPending || summaryQuery.isPending ||
    comparisonQuery.isPending || spendingQuery.isPending || investmentsQuery.isPending ||
    contributionsQuery.isPending || invSummaryQuery.isPending || billsQuery.isPending;

  const isError =
    categoriesQuery.isError || transactionsQuery.isError || summaryQuery.isError ||
    comparisonQuery.isError || spendingQuery.isError || investmentsQuery.isError ||
    contributionsQuery.isError || invSummaryQuery.isError || billsQuery.isError;

  const invalidateMonth = () => {
    ["transactions","summary","comparison","spending","invSummary","contributions","bills"].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k, currentDate.year, currentDate.month] }),
    );
  };

  // ── Handlers ──
  const handleAddBill = async (data: {
    name: string; amount: number; category_id: string | null; due_day: number;
    installment?: { total: number; start_month: number; start_year: number };
  }) => {
    if (data.installment) {
      await createInstallmentBills({ data: {
        name: data.name, amount: data.amount, category_id: data.category_id,
        due_day: data.due_day, total: data.installment.total,
        start_month: data.installment.start_month, start_year: data.installment.start_year,
      }});
    } else {
      await createBill({ data });
    }
    invalidateMonth();
  };
  const handleUpdateBill = async (data: { id: string; name: string; amount: number; category_id: string | null; due_day: number }) => {
    await updateBill({ data });
    invalidateMonth();
  };
  const handleDeleteBill = async (id: string, groupId?: string) => {
    if (groupId) {
      await deleteInstallmentGroup({ data: { group_id: groupId } });
    } else {
      await deleteBill({ data: { id } });
    }
    invalidateMonth();
  };
  const handlePayBill = async (bill_id: string, date: string) => { await payBill({ data: { bill_id, date } }); invalidateMonth(); };
  const handleUnpayBill = async (transaction_id: string) => { await unpayBill({ data: { transaction_id } }); invalidateMonth(); };

  const handleAddTransaction = async (data: { type: TransactionType; categoryId: string | null; amount: number; description: string; date: string; installmentTotal?: number }) => {
    try {
      if (data.installmentTotal && data.installmentTotal >= 2) {
        await createInstallmentTransactions({ data: { ...data, total: data.installmentTotal } });
        toast.success(`${data.installmentTotal} parcelas adicionadas!`);
      } else {
        await createTransaction({ data });
        toast.success("Lançamento adicionado!");
      }
      invalidateMonth();
    } catch { toast.error("Erro ao adicionar lançamento."); throw new Error("failed"); }
  };

  const handleEditTransaction = async (data: { type: TransactionType; categoryId: string | null; amount: number; description: string; date: string }) => {
    if (!editingTransaction) return;
    try {
      await updateTransaction({ data: { id: editingTransaction.id, ...data } });
      invalidateMonth();
      setEditingTransaction(null);
      toast.success("Lançamento atualizado!");
    } catch { toast.error("Erro ao atualizar lançamento."); throw new Error("failed"); }
  };

  const handleDeleteTransaction = async (id: string) => {
    try { await deleteTransaction({ data: { id } }); invalidateMonth(); toast.success("Lançamento excluído."); }
    catch { toast.error("Erro ao excluir lançamento."); }
  };

  const handleAddCategory = async (data: { name: string; type: TransactionType; expense_kind: ExpenseKind | null; icon: string | null }) => {
    try { await createCategory({ data }); queryClient.invalidateQueries({ queryKey: ["categories"] }); invalidateMonth(); toast.success("Categoria criada!"); }
    catch { toast.error("Erro ao criar categoria."); }
  };
  const handleUpdateCategory = async (data: { id: string; name: string; type: TransactionType; expense_kind: ExpenseKind | null; icon: string | null }) => {
    try { await updateCategory({ data }); queryClient.invalidateQueries({ queryKey: ["categories"] }); invalidateMonth(); toast.success("Categoria atualizada!"); }
    catch { toast.error("Erro ao atualizar categoria."); }
  };
  const handleDeleteCategory = async (id: string) => {
    try { await deleteCategory({ data: { id } }); queryClient.invalidateQueries({ queryKey: ["categories"] }); invalidateMonth(); toast.success("Categoria excluída."); }
    catch { toast.error("Erro ao excluir categoria."); }
  };

  const handleAddInvestment = async (data: { name: string; type: InvestmentType; current_value: number }) => {
    try { await createInvestment({ data }); queryClient.invalidateQueries({ queryKey: ["investments"] }); queryClient.invalidateQueries({ queryKey: ["invSummary", currentDate.year, currentDate.month] }); toast.success("Investimento adicionado!"); }
    catch { toast.error("Erro ao adicionar investimento."); }
  };
  const handleUpdateInvestment = async (data: { id: string; name: string; type: InvestmentType; current_value: number }) => {
    try { await updateInvestment({ data }); queryClient.invalidateQueries({ queryKey: ["investments"] }); queryClient.invalidateQueries({ queryKey: ["invSummary", currentDate.year, currentDate.month] }); toast.success("Investimento atualizado!"); }
    catch { toast.error("Erro ao atualizar investimento."); }
  };
  const handleDeleteInvestment = async (id: string) => {
    try { await deleteInvestment({ data: { id } }); queryClient.invalidateQueries({ queryKey: ["investments"] }); queryClient.invalidateQueries({ queryKey: ["invSummary", currentDate.year, currentDate.month] }); queryClient.invalidateQueries({ queryKey: ["contributions", currentDate.year, currentDate.month] }); toast.success("Investimento excluído."); }
    catch { toast.error("Erro ao excluir investimento."); }
  };
  const handleAddContribution = async (data: { investment_id: string; amount: number; date: string; notes: string | null; linkToCashflow: boolean }) => {
    try { await createContribution({ data }); queryClient.invalidateQueries({ queryKey: ["investments"] }); invalidateMonth(); toast.success("Aporte registrado!"); }
    catch { toast.error("Erro ao registrar aporte."); }
  };
  const handleDeleteContribution = async (id: string) => {
    try { await deleteContribution({ data: { id } }); queryClient.invalidateQueries({ queryKey: ["investments"] }); invalidateMonth(); toast.success("Aporte excluído."); }
    catch { toast.error("Erro ao excluir aporte."); }
  };

  // ── Loading / Error ──
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <NexoMark size={40} />
          <p className="text-sm text-muted-foreground animate-pulse">Carregando…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-lg font-heading font-bold">Erro ao carregar dados</h2>
          <p className="text-sm text-muted-foreground">Tente recarregar a página.</p>
          <button onClick={() => window.location.reload()} className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity">
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
  const bills = billsQuery.data ?? [];
  const household = householdQuery.data ?? null;

  const memberMap = household
    ? Object.fromEntries(
        [household.me, ...(household.partner ? [household.partner] : [])].map((m) => [m.userId, m])
      )
    : {};

  const pendingBills = bills.filter((b) => !b.paid_transaction_id);
  const recentTx = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const { fmt } = useCurrency();
  const fmtDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });

  const navTabs = [
    { id: "inicio" as Tab, label: "Início", icon: Home },
    { id: "agenda" as Tab, label: "Agenda", icon: CalendarDays },
    { id: "investir" as Tab, label: "Investir", icon: TrendingUp },
    { id: "config" as Tab, label: "Config.", icon: Settings },
  ] as const;

  // ── Month selector (shared) ──
  const MonthNav = () => (
    <div className="flex items-center gap-1">
      <button onClick={prevMonth} className="size-8 rounded-lg border border-border bg-card hover:bg-surface flex items-center justify-center transition-colors" aria-label="Mês anterior">
        <ChevronLeft className="size-3.5 text-muted-foreground" />
      </button>
      <div className="relative">
        <button
          onClick={() => setMonthPickerOpen(!monthPickerOpen)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border bg-card hover:bg-surface text-sm font-semibold transition-colors"
        >
          <span>{months[currentDate.month - 1].slice(0, 3)}</span>
          <span className="text-muted-foreground font-normal">{currentDate.year}</span>
        </button>
        {monthPickerOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMonthPickerOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-52 bg-card rounded-2xl border border-border p-3.5 z-20 space-y-2.5 shadow-xl shadow-foreground/10">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1">Ano</label>
                <input type="number" value={currentDate.year} min={2000} max={2099} onChange={(e) => setCurrentDate((d) => ({ ...d, year: Math.min(Math.max(Number(e.target.value), 2000), 2099) }))}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1">Mês</label>
                <select value={currentDate.month} onChange={(e) => { setCurrentDate((d) => ({ ...d, month: Number(e.target.value) })); setMonthPickerOpen(false); }}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-colors">
                  {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
            </div>
          </>
        )}
      </div>
      <button onClick={nextMonth} className="size-8 rounded-lg border border-border bg-card hover:bg-surface flex items-center justify-center transition-colors" aria-label="Próximo mês">
        <ChevronRight className="size-3.5 text-muted-foreground" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Desktop top nav ─────────────────────────────────── */}
      <header className="hidden md:flex sticky top-0 z-40 bg-card border-b border-border h-[56px] items-center px-6 gap-0 shrink-0">
        <div className="mr-6">
          <NexoLogo size={32} />
        </div>

        {navTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 h-[56px] text-[13px] font-semibold border-b-2 transition-all ${
              activeTab === t.id
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <MonthNav />
          <button onClick={toggleDark} className="size-9 rounded-xl border border-border bg-card hover:bg-surface flex items-center justify-center transition-colors" aria-label="Alternar tema">
            {isDark ? <Sun className="size-4 text-muted-foreground" /> : <Moon className="size-4 text-muted-foreground" />}
          </button>
          <button onClick={() => supabase.auth.signOut()} className="size-9 rounded-xl border border-border bg-card hover:bg-surface flex items-center justify-center transition-colors group" aria-label="Sair">
            <LogOut className="size-4 text-muted-foreground group-hover:text-expense transition-colors" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 h-9 bg-brand text-white rounded-xl text-[13px] font-bold hover:opacity-90 transition-opacity shadow-sm shadow-brand/30"
          >
            <Plus className="size-3.5" /> Novo
          </button>
        </div>
      </header>

      {/* ── Mobile top bar (logo + month nav) ───────────────── */}
      <div className="md:hidden flex items-center justify-between px-4 pt-4 pb-2 bg-background shrink-0">
        <NexoLogo size={30} />
        <MonthNav />
      </div>

      {/* ── Trial banner ────────────────────────────────────── */}
      {daysLeft !== null && (
        <div className={`border-b px-4 py-2 flex items-center justify-center gap-2 text-[12px] font-semibold shrink-0 ${
          daysLeft <= 3
            ? "bg-expense/10 border-expense/20 text-expense dark:text-red-400"
            : daysLeft <= 7
            ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
            : "bg-brand/10 border-brand/20 text-brand dark:text-teal-400"
        }`}>
          <Clock className="size-3.5 shrink-0" />
          {`Versão de demonstração · ${daysLeft} dia${daysLeft === 1 ? "" : "s"} restante${daysLeft === 1 ? "" : "s"}`}
        </div>
      )}

      {/* ── Tab content ─────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-[76px] md:pb-6">
        <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">

          {/* INÍCIO */}
          {activeTab === "inicio" && (
            <div className="space-y-4">
              {/* Hero balance card */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "linear-gradient(135deg, #52b8ac 0%, #6ec6ba 60%, #82d4c8 100%)" }}
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">Saldo do Mês</div>
                <div className="text-[32px] font-bold text-white leading-none mb-2 tabular-nums">{fmt(summary.balance)}</div>
                <div className="flex items-center gap-4 text-[11px] font-semibold text-white/80">
                  <span className="flex items-center gap-1"><ArrowUpRight className="size-3" />{fmt(summary.totalIncome)}</span>
                  <span className="flex items-center gap-1"><ArrowDownRight className="size-3" />{fmt(summary.totalExpense)}</span>
                </div>
                {summary.totalIncome > 0 && (
                  <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden flex gap-0.5">
                    <div className="bg-white/80 rounded-full" style={{ width: `${Math.min(100, (summary.totalIncome / (summary.totalIncome + summary.totalExpense)) * 100)}%` }} />
                    <div className="bg-white/30 rounded-full flex-1" />
                  </div>
                )}
              </div>

              {/* Pending bills */}
              {pendingBills.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "oklch(0.60 0.12 75)" }}>
                      ⚠ A Pagar
                    </span>
                    <button onClick={() => setActiveTab("agenda")} className="text-[11px] font-semibold text-brand">
                      Ver agenda →
                    </button>
                  </div>
                  <div className="bg-card rounded-2xl border border-border overflow-hidden card-shadow divide-y divide-border/60">
                    {pendingBills.map((bill) => (
                      <div key={bill.id} className="flex items-center gap-3 px-4 py-3.5">
                        <div className="size-8 rounded-xl flex items-center justify-center shrink-0 text-sm" style={{ background: "oklch(0.72 0.14 75 / 0.10)" }}>
                          {bill.category?.icon ? <span className="opacity-65">{bill.category.icon}</span> : <span className="text-[10px] font-bold" style={{ color: "oklch(0.60 0.12 75)" }}>!</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{bill.name}</div>
                          <div className="text-[10px] text-muted-foreground">dia {bill.due_day}</div>
                        </div>
                        <div className="text-sm font-bold text-expense tabular-nums">{fmt(bill.amount)}</div>
                        <button
                          onClick={async () => {
                            const today = `${currentDate.year}-${String(currentDate.month).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
                            await handlePayBill(bill.id, today);
                          }}
                          className="px-3 py-1.5 bg-income text-white rounded-lg text-[11px] font-bold hover:opacity-90 transition-opacity"
                        >
                          Pagar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent transactions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recentes</span>
                  {transactions.length > 6 && (
                    <button onClick={() => setActiveTab("agenda")} className="text-[11px] font-semibold text-brand">
                      Ver todos →
                    </button>
                  )}
                </div>
                {recentTx.length === 0 ? (
                  <div className="bg-card rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground card-shadow">
                    Nenhum lançamento este mês.
                    <br />
                    <button onClick={() => setShowAdd(true)} className="mt-2 text-brand font-semibold">Adicionar primeiro →</button>
                  </div>
                ) : (
                  <div className="bg-card rounded-2xl border border-border overflow-hidden card-shadow divide-y divide-border/60">
                    {recentTx.map((t) => {
                      const creator = t.created_by ? memberMap[t.created_by] : null;
                      const showAvatar = !!household?.partner && !!creator;
                      return (
                        <div key={t.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface/60 transition-colors">
                          <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${t.type === "income" ? "bg-income/10" : "bg-expense/8"}`}>
                            {t.type === "income"
                              ? <ArrowUpRight className="size-3.5 text-income" />
                              : <ArrowDownRight className="size-3.5 text-expense" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{t.description}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              {t.category?.icon && <span className="opacity-50">{t.category.icon}</span>}
                              <span>{t.category?.name ?? "Sem categoria"}</span>
                              <span className="opacity-40">·</span>
                              <span>{fmtDate(t.date)}</span>
                            </div>
                          </div>
                          {showAvatar && creator && (
                            <UserAvatar initials={creator.initials} color={creator.color} size="xs" title={creator.displayName} />
                          )}
                          <div className={`text-sm font-bold tabular-nums ${t.type === "income" ? "text-income" : "text-expense"}`}>
                            {t.type === "income" ? "+" : "−"}{fmt(t.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mini summary cards on desktop */}
              <div className="hidden md:block">
                <TotalCards summary={summary} investments={invSummary} />
              </div>
            </div>
          )}

          {/* AGENDA */}
          {activeTab === "agenda" && (
            <div className="space-y-6">
              <AgendaView
                bills={bills}
                transactions={transactions}
                categories={categories}
                currentDate={currentDate}
                onPayBill={handlePayBill}
                onUnpayBill={handleUnpayBill}
                onDeleteTransaction={handleDeleteTransaction}
                onEditTransaction={setEditingTransaction}
              />
              <Charts monthlyComparison={comparison} categorySpending={spending} investments={invSummary} />
            </div>
          )}

          {/* INVESTIR */}
          {activeTab === "investir" && (
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
          )}

          {/* CONFIG */}
          {activeTab === "config" && (
            <div className="space-y-5">
              <h2 className="text-base font-heading font-bold">Definições</h2>

              {/* Bill templates management */}
              <div className="bg-card rounded-2xl border border-border p-5 card-shadow">
                <h3 className="text-sm font-semibold mb-3">Contas Recorrentes</h3>
                <BillsSection
                  bills={bills}
                  categories={categories}
                  currentDate={currentDate}
                  onAdd={handleAddBill}
                  onUpdate={handleUpdateBill}
                  onDelete={handleDeleteBill}
                  onPay={handlePayBill}
                  onUnpay={handleUnpayBill}
                />
              </div>

              {/* Categories */}
              <div className="bg-card rounded-2xl border border-border p-5 card-shadow flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Categorias</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{categories.length} categorias criadas</div>
                </div>
                <CategoryManager
                  categories={categories}
                  onAdd={handleAddCategory}
                  onUpdate={handleUpdateCategory}
                  onDelete={handleDeleteCategory}
                />
              </div>

              {/* Partilha */}
              {household && (
                <div className="bg-card rounded-2xl border border-border p-5 card-shadow">
                  <HouseholdSettings
                    info={household}
                    onRefresh={() => queryClient.invalidateQueries({ queryKey: ["household"] })}
                  />
                </div>
              )}

              {/* Notificações */}
              <div className="bg-card rounded-2xl border border-border p-5 card-shadow">
                <NotificationSettings />
              </div>

              {/* Account */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden card-shadow">
                <button
                  onClick={toggleDark}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium hover:bg-surface transition-colors border-b border-border"
                >
                  <span>{isDark ? "Modo escuro ativo" : "Modo claro ativo"}</span>
                  {isDark ? <Moon className="size-4 text-muted-foreground" /> : <Sun className="size-4 text-muted-foreground" />}
                </button>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-expense hover:bg-expense/5 transition-colors"
                >
                  <span>Sair da conta</span>
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Mobile bottom nav ───────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border flex items-end justify-around px-2 pb-safe"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)", height: 72 }}>
        {navTabs.slice(0, 2).map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${activeTab === t.id ? "text-brand" : "text-muted-foreground"}`}>
            <t.icon className={`size-[22px] transition-all ${activeTab === t.id ? "opacity-100" : "opacity-45"}`} strokeWidth={activeTab === t.id ? 2 : 1.5} />
            <span className="text-[9px] font-semibold tracking-wide">{t.label}</span>
          </button>
        ))}

        {/* FAB */}
        <button
          onClick={() => setShowAdd(true)}
          className="flex flex-col items-center -mt-4 mb-1"
          aria-label="Novo lançamento"
        >
          <div className="size-[52px] rounded-full bg-brand flex items-center justify-center shadow-lg shadow-brand/35 active:scale-95 transition-transform">
            <Plus className="size-6 text-white" strokeWidth={2.5} />
          </div>
        </button>

        {navTabs.slice(2).map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${activeTab === t.id ? "text-brand" : "text-muted-foreground"}`}>
            <t.icon className={`size-[22px] transition-all ${activeTab === t.id ? "opacity-100" : "opacity-45"}`} strokeWidth={activeTab === t.id ? 2 : 1.5} />
            <span className="text-[9px] font-semibold tracking-wide">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Dialogs ──────────────────────────────────────────── */}
      <AddTransactionDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        categories={categories}
        currentDate={currentDate}
        onSubmit={handleAddTransaction}
      />
      {editingTransaction && (
        <AddTransactionDialog
          categories={categories}
          currentDate={currentDate}
          onSubmit={handleEditTransaction}
          editingTransaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
}
