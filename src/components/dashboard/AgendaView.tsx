import { useState } from "react";
import { Pencil, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { BillWithStatus, Transaction, Category } from "@/lib/budget.types";
import { useCurrency } from "@/contexts/CurrencyContext";

interface AgendaViewProps {
  bills: BillWithStatus[];
  transactions: Transaction[];
  categories: Category[];
  currentDate: { year: number; month: number };
  onPayBill: (bill_id: string, date: string) => Promise<void>;
  onUnpayBill: (transaction_id: string) => Promise<void>;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
}

type AgendaFilter = "todos" | "pendentes" | "entradas" | "despesas";

export function AgendaView({
  bills,
  transactions,
  currentDate,
  onPayBill,
  onUnpayBill,
  onDeleteTransaction,
  onEditTransaction,
}: AgendaViewProps) {
  const [filter, setFilter] = useState<AgendaFilter>("todos");
  const [payingId, setPayingId] = useState<string | null>(null);

  const { fmt } = useCurrency();

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
  };

  const pendingBills = bills.filter((b) => !b.paid_transaction_id);
  const pendingTotal = pendingBills.reduce((s, b) => s + b.amount, 0);
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const showPending = filter === "todos" || filter === "pendentes";
  const showTx = filter === "todos" || filter === "entradas" || filter === "despesas";
  const filteredTx = transactions.filter((t) => {
    if (filter === "entradas") return t.type === "income";
    if (filter === "despesas") return t.type === "expense";
    return true;
  });

  const handlePay = async (billId: string) => {
    setPayingId(billId);
    const today = `${currentDate.year}-${String(currentDate.month).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
    try {
      await onPayBill(billId, today);
    } finally {
      setPayingId(null);
    }
  };

  const handleDelete = (id: string, desc: string) => {
    if (!confirm(`Excluir "${desc}"?`)) return;
    onDeleteTransaction(id);
  };

  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-2xl border border-border p-3.5 card-shadow">
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Entradas</div>
          <div className="text-base font-bold text-income tabular-nums">{fmt(totalIncome)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-3.5 card-shadow">
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Despesas</div>
          <div className="text-base font-bold text-expense tabular-nums">{fmt(totalExpense)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-3.5 card-shadow">
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">A Pagar</div>
          <div className="text-base font-bold tabular-nums" style={{ color: pendingTotal > 0 ? "oklch(0.72 0.14 75)" : "var(--color-income)" }}>
            {fmt(pendingTotal)}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {(["todos", "pendentes", "entradas", "despesas"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
              filter === f
                ? "bg-brand border-brand text-white"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "todos" ? "Todos" : f === "pendentes" ? "Pendentes" : f === "entradas" ? "Entradas" : "Despesas"}
          </button>
        ))}
      </div>

      {/* Month label */}
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {months[currentDate.month - 1]} {currentDate.year}
      </div>

      {/* Pending group */}
      {showPending && pendingBills.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden card-shadow">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border" style={{ background: "oklch(0.72 0.14 75 / 0.06)" }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "oklch(0.60 0.12 75)" }}>
              ⚠ A Pagar
            </span>
            <span className="ml-auto text-xs font-bold text-expense">{fmt(pendingTotal)}</span>
          </div>
          <div className="divide-y divide-border/60">
            {pendingBills.map((bill) => (
              <div key={bill.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface/60 transition-colors">
                <div className="size-8 rounded-xl flex items-center justify-center shrink-0 text-sm"
                  style={{ background: "oklch(0.72 0.14 75 / 0.10)" }}>
                  {bill.category?.icon ? (
                    <span className="opacity-70">{bill.category.icon}</span>
                  ) : (
                    <span className="text-[10px] font-bold" style={{ color: "oklch(0.60 0.12 75)" }}>!</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{bill.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {bill.is_active ? "Recorrente" : "Com vencimento"} · vence dia {bill.due_day}
                    {bill.is_overdue && (
                      <span className="ml-1.5 text-expense font-semibold">Atrasada</span>
                    )}
                  </div>
                </div>
                <div className="text-sm font-bold text-expense tabular-nums shrink-0">{fmt(bill.amount)}</div>
                <button
                  onClick={() => handlePay(bill.id)}
                  disabled={payingId === bill.id}
                  className="ml-1 shrink-0 px-3 py-1.5 bg-income text-white rounded-lg text-[11px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {payingId === bill.id ? "…" : "Pagar"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paid / Received group */}
      {showTx && filteredTx.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden card-shadow">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-income/[0.05]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-income">✓ Pago / Recebido</span>
          </div>
          <div className="divide-y divide-border/60">
            {filteredTx.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface/60 transition-colors group">
                <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${
                  t.type === "income" ? "bg-income/10" : "bg-expense/8"
                }`}>
                  {t.type === "income"
                    ? <ArrowUpRight className="size-3.5 text-income" />
                    : <ArrowDownRight className="size-3.5 text-expense" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">{t.description}</span>
                    {t.bill_id && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-income/10 text-income">
                        Conta
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {t.category ? (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {t.category.icon && <span className="opacity-50">{t.category.icon}</span>}
                        {t.category.name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60">Sem categoria</span>
                    )}
                    <span className="text-[10px] text-muted-foreground/50">·</span>
                    <span className="text-[10px] text-muted-foreground">{fmtDate(t.date)}</span>
                  </div>
                </div>
                <div className={`text-sm font-bold tabular-nums shrink-0 ${t.type === "income" ? "text-income" : "text-expense"}`}>
                  {t.type === "income" ? "+" : "−"}{fmt(t.amount)}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => onEditTransaction(t)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/8 transition-colors"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id, t.description)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-expense hover:bg-expense/8 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  {t.bill_id && (
                    <button
                      onClick={() => onUnpayBill(t.id)}
                      title="Desfazer pagamento"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-expense hover:bg-expense/8 transition-colors text-[10px] font-bold"
                    >
                      ↩
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTx && filteredTx.length === 0 && (!showPending || pendingBills.length === 0) && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Nenhum lançamento neste período.
        </div>
      )}
    </div>
  );
}
