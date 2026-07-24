import type { ReactNode } from "react";
import { Trash2, Pencil, ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import type { Transaction } from "@/lib/budget.types";

export type TransactionFilter = "all" | "income" | "fixed" | "variable" | "investments";

interface TransactionTableProps {
  transactions: Transaction[];
  filter: TransactionFilter;
  onFilterChange: (filter: TransactionFilter) => void;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  investmentsSlot?: ReactNode;
}

const filterLabels: Record<TransactionFilter, string> = {
  all: "Todos",
  income: "Entradas",
  fixed: "Fixas",
  variable: "Variáveis",
  investments: "Investimentos",
};

export function TransactionTable({
  transactions,
  filter,
  onFilterChange,
  onDelete,
  onEdit,
  investmentsSlot,
}: TransactionTableProps) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
  };

  const filtered = transactions.filter((t) => {
    if (filter === "all") return true;
    if (filter === "income") return t.type === "income";
    if (filter === "investments") return false;
    if (t.type !== "expense") return false;
    const kind = t.category?.expense_kind ?? null;
    if (filter === "fixed") return kind === "fixed";
    if (filter === "variable") return kind === "variable" || kind === null;
    return true;
  });

  const handleDelete = (id: string, description: string) => {
    if (!confirm(`Excluir "${description}"? Esta ação não pode ser desfeita.`)) return;
    onDelete(id);
  };

  return (
    <div className="lg:col-span-8 bg-card rounded-2xl border border-border card-shadow overflow-hidden flex flex-col">

      {/* Filter bar */}
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5 mr-1">
          <div className="size-7 rounded-lg bg-brand/10 flex items-center justify-center">
            <Receipt className="size-3.5 text-brand" />
          </div>
          <span className="text-sm font-heading font-semibold">Lançamentos</span>
        </div>
        <div className="flex bg-surface p-0.5 rounded-xl gap-0.5 flex-wrap">
          {(["all", "income", "fixed", "variable", "investments"] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === f
                  ? "bg-card shadow-sm text-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {filter !== "investments" && `${filtered.length} lançamento${filtered.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {filter === "investments" ? (
        <div className="p-5 flex-1 overflow-auto">{investmentsSlot}</div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Descrição</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Categoria</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">Valor</th>
                <th className="px-3 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Nenhum lançamento neste período.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-surface/40 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${
                          t.type === "income" ? "bg-income/10" : "bg-expense/8"
                        }`}>
                          {t.type === "income"
                            ? <ArrowUpRight className="size-3.5 text-income" />
                            : <ArrowDownRight className="size-3.5 text-expense" />}
                        </div>
                        <span className="font-medium text-sm truncate max-w-[180px]">{t.description}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {t.category ? (
                          <span className="px-2.5 py-0.5 bg-surface text-muted-foreground rounded-full text-[11px] font-medium border border-border/50">
                            {t.category.name}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-surface/50 text-muted-foreground/50 rounded-full text-[11px] font-medium border border-border/30">
                            Sem categoria
                          </span>
                        )}
                        {t.type === "expense" && (
                          t.category?.expense_kind === "fixed"
                            ? <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider bg-brand/8 text-brand">Fixa</span>
                            : <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider bg-expense/8 text-expense">Var.</span>
                        )}
                        {t.bill_id && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider bg-income/10 text-income">Conta</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground tabular-nums">{fmtDate(t.date)}</td>
                    <td className={`px-4 py-3.5 text-sm font-semibold text-right tabular-nums ${
                      t.type === "income" ? "text-income" : "text-expense"
                    }`}>
                      {t.type === "income" ? "+" : "−"}{fmt(t.amount)}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(t)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/8 transition-colors"
                          aria-label="Editar lançamento"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.description)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-expense hover:bg-expense/8 transition-colors"
                          aria-label="Excluir lançamento"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

