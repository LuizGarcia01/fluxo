import { BarChart2, PieChart, Tag } from "lucide-react";
import type { CategorySpending, InvestmentSummary, InvestmentType } from "@/lib/budget.types";

interface ChartsProps {
  monthlyComparison: { month: string; income: number; expense: number }[];
  categorySpending: CategorySpending[];
  investments: InvestmentSummary;
}

const TYPE_LABELS: Record<InvestmentType, string> = {
  renda_fixa: "Renda Fixa",
  acoes: "Ações",
  fii: "FIIs",
  cripto: "Cripto",
  outros: "Outros",
};

const TYPE_COLORS: Record<InvestmentType, string> = {
  renda_fixa: "bg-brand",
  acoes: "bg-income",
  fii: "bg-expense",
  cripto: "bg-yellow-500",
  outros: "bg-muted-foreground/50",
};

const TYPE_TEXT: Record<InvestmentType, string> = {
  renda_fixa: "text-brand",
  acoes: "text-income",
  fii: "text-expense",
  cripto: "text-yellow-600",
  outros: "text-muted-foreground",
};

export function Charts({ monthlyComparison, categorySpending, investments }: ChartsProps) {
  const maxValue = Math.max(...monthlyComparison.flatMap((m) => [m.income, m.expense]), 1);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

  const fixed = categorySpending.filter((c) => c.category.expense_kind === "fixed");
  const variable = categorySpending.filter((c) => c.category.expense_kind === "variable");

  const totalAll = categorySpending.reduce((s, c) => s + c.amount, 0) || 1;
  const fixedShare = Math.round((fixed.reduce((s, c) => s + c.amount, 0) / totalAll) * 100);
  const variableShare = Math.max(0, 100 - fixedShare);

  const renderCategoryGroup = (title: string, arr: CategorySpending[], colorClass: string, textClass: string) => {
    if (arr.length === 0) return null;
    return (
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
        {arr.map((item) => (
          <div key={item.category.id} className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-medium truncate max-w-[120px]">{item.category.name}</span>
              <span className={`text-xs font-semibold tabular-nums ${textClass}`}>{item.percentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
              <div
                className={`h-full ${colorClass} rounded-full transition-all`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground tabular-nums">{fmt(item.amount)}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="lg:col-span-4 space-y-3">

      {/* Monthly comparison */}
      <div className="bg-card rounded-2xl border border-border card-shadow" style={{ padding: "1.25rem" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <BarChart2 className="size-4 text-brand" />
            </div>
            <h3 className="text-sm font-heading font-semibold">Comparativo Mensal</h3>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">4 meses</span>
        </div>
        <div className="flex items-end gap-3 h-28">
          {monthlyComparison.map((m) => {
            const incomeH = Math.round((m.income / maxValue) * 100);
            const expenseH = Math.round((m.expense / maxValue) * 100);
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full">
                <div className="w-full flex flex-col-reverse gap-1 h-full group cursor-default" title={`${m.month}: Entradas ${fmt(m.income)} / Saídas ${fmt(m.expense)}`}>
                  <div
                    className="bg-income/70 w-full rounded-t-sm hover:bg-income transition-colors"
                    style={{ height: `${incomeH}%` }}
                  />
                  <div
                    className="bg-expense/70 w-full rounded-t-sm hover:bg-expense transition-colors"
                    style={{ height: `${expenseH}%` }}
                  />
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{m.month}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-2 rounded-full bg-income inline-block" />
            Entradas
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-2 rounded-full bg-expense inline-block" />
            Saídas
          </span>
        </div>
      </div>

      {/* Investment allocation */}
      <div className="bg-card rounded-2xl border border-border card-shadow" style={{ padding: "1.25rem" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <PieChart className="size-4 text-brand" />
            </div>
            <h3 className="text-sm font-heading font-semibold">Alocação</h3>
          </div>
          <span className="text-[11px] font-semibold text-brand tabular-nums">{fmt(investments.totalPatrimony)}</span>
        </div>
        {investments.allocation.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nenhum investimento cadastrado.</p>
        ) : (
          <>
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface gap-0.5 mb-4">
              {investments.allocation.map((a) => (
                <div
                  key={a.type}
                  className={`${TYPE_COLORS[a.type]} transition-all first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${a.percentage}%` }}
                  title={`${TYPE_LABELS[a.type]}: ${a.percentage}%`}
                />
              ))}
            </div>
            <div className="space-y-2">
              {investments.allocation.map((a) => (
                <div key={a.type} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs">
                    <span className={`size-2 rounded-full inline-block ${TYPE_COLORS[a.type]}`} />
                    <span className="font-medium">{TYPE_LABELS[a.type]}</span>
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {fmt(a.amount)}
                    <span className={`ml-1.5 font-semibold ${TYPE_TEXT[a.type]}`}>{a.percentage}%</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Category spending */}
      <div className="bg-card rounded-2xl border border-border card-shadow" style={{ padding: "1.25rem" }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="size-8 rounded-lg bg-expense/10 flex items-center justify-center">
            <Tag className="size-4 text-expense" />
          </div>
          <h3 className="text-sm font-heading font-semibold">Gastos por Categoria</h3>
        </div>
        {categorySpending.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nenhum gasto registrado.</p>
        ) : (
          <>
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface mb-2 gap-0.5">
              <div className="bg-brand first:rounded-l-full" style={{ width: `${fixedShare}%` }} />
              <div className="bg-expense last:rounded-r-full" style={{ width: `${variableShare}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-5">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-brand inline-block" />
                Fixas {fixedShare}%
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-expense inline-block" />
                Variáveis {variableShare}%
              </span>
            </div>
            <div className="space-y-5">
              {renderCategoryGroup("Fixas", fixed, "bg-brand", "text-brand")}
              {renderCategoryGroup("Variáveis", variable, "bg-expense", "text-expense")}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

