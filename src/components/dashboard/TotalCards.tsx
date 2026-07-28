import { TrendingUp, TrendingDown, Wallet, BarChart3, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import type { MonthlySummary, InvestmentSummary } from "@/lib/budget.types";
import { useCurrency } from "@/contexts/CurrencyContext";

interface TotalCardsProps {
  summary: MonthlySummary;
  investments: InvestmentSummary;
}

export function TotalCards({ summary, investments }: TotalCardsProps) {
  const { fmt, fmtShort } = useCurrency();

  const fixedPct = summary.totalExpense > 0
    ? Math.round((summary.totalFixedExpense / summary.totalExpense) * 100)
    : 0;
  const variablePct = Math.max(0, 100 - fixedPct);
  const balancePositive = summary.balance >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

      {/* ── Saldo ── colored card */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 flex flex-col"
        style={{
          background: "linear-gradient(140deg, #7ab4ad 0%, #4d9890 55%, #2d7a74 100%)",
          boxShadow: "0 4px 20px -2px #7ab4ad55",
          minHeight: "152px",
        }}
      >
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, white, transparent 70%)" }}
        />
        {/* top row */}
        <div className="relative flex items-center justify-between mb-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-white/60">Saldo do Mês</span>
          <div className="size-8 rounded-lg bg-white/15 flex items-center justify-center">
            <Wallet className="size-4 text-white/80" />
          </div>
        </div>
        {/* value */}
        <p className="relative text-[1.55rem] font-heading font-semibold text-white tabular-nums leading-none mb-auto">
          {fmt(summary.balance)}
        </p>
        {/* bottom */}
        <div className="relative mt-4 pt-3 border-t border-white/15 flex items-center gap-1.5">
          {balancePositive
            ? <TrendingUp className="size-3.5 text-white/60" />
            : <TrendingDown className="size-3.5 text-white/60" />}
          <span className="text-[11px] text-white/60 font-medium tabular-nums">
            {fmtShort(Math.abs(investments.monthContributions))} investido
          </span>
        </div>
      </div>

      {/* ── Entradas ── */}
      <div className="bg-card rounded-2xl border border-border p-5 flex flex-col card-shadow" style={{ minHeight: "152px" }}>
        {/* top row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Entradas</span>
          <div className="size-8 rounded-lg bg-income/10 flex items-center justify-center">
            <ArrowUpCircle className="size-4 text-income" />
          </div>
        </div>
        {/* value */}
        <p className="text-[1.55rem] font-heading font-semibold text-income tabular-nums leading-none mb-auto">
          {fmt(summary.totalIncome)}
        </p>
        {/* bottom — mesma altura que os outros */}
        <div className="mt-4 pt-3 border-t border-border space-y-1.5">
          <div className="h-1.5 w-full bg-income/12 rounded-full overflow-hidden">
            <div className="h-full bg-income rounded-full w-full" />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
            <span>Total do mês</span>
            <span className="tabular-nums text-income">{fmtShort(summary.totalIncome)}</span>
          </div>
        </div>
      </div>

      {/* ── Despesas ── */}
      <div className="bg-card rounded-2xl border border-border p-5 flex flex-col card-shadow" style={{ minHeight: "152px" }}>
        {/* top row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Despesas</span>
          <div className="size-8 rounded-lg bg-expense/10 flex items-center justify-center">
            <ArrowDownCircle className="size-4 text-expense" />
          </div>
        </div>
        {/* value */}
        <p className="text-[1.55rem] font-heading font-semibold text-expense tabular-nums leading-none mb-auto">
          {fmt(summary.totalExpense)}
        </p>
        {/* bottom */}
        <div className="mt-4 pt-3 border-t border-border space-y-1.5">
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden flex">
            <div className="h-full bg-brand rounded-l-full transition-all" style={{ width: `${fixedPct}%` }} />
            <div className="h-full bg-expense rounded-r-full transition-all" style={{ width: `${variablePct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-brand inline-block" />
              Fixas {fmtShort(summary.totalFixedExpense)}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-expense inline-block" />
              Var. {fmtShort(summary.totalVariableExpense)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Patrimônio ── */}
      <div className="bg-card rounded-2xl border border-border p-5 flex flex-col card-shadow" style={{ minHeight: "152px" }}>
        {/* top row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Patrimônio</span>
          <div className="size-8 rounded-lg bg-brand/10 flex items-center justify-center">
            <BarChart3 className="size-4 text-brand" />
          </div>
        </div>
        {/* value */}
        <p className="text-[1.55rem] font-heading font-semibold text-brand tabular-nums leading-none mb-auto">
          {fmt(investments.totalPatrimony)}
        </p>
        {/* bottom */}
        <div className="mt-4 pt-3 border-t border-border space-y-1.5">
          <div className="h-1.5 w-full bg-brand/12 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{ width: `${Math.min(100, investments.savingsRate)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
            <span className="tabular-nums">
              {investments.monthContributions >= 0 ? "+" : ""}{fmtShort(investments.monthContributions)} este mês
            </span>
            <span>{investments.savingsRate}% renda</span>
          </div>
        </div>
      </div>

    </div>
  );
}

