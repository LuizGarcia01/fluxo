import { useState } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  CalendarCheck,
  Undo2,
  Layers,
} from "lucide-react";
import type { BillWithStatus, BillTemplate, Category } from "@/lib/budget.types";

const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

interface BillsSectionProps {
  bills: BillWithStatus[];
  categories: Category[];
  currentDate: { year: number; month: number };
  onAdd: (data: {
    name: string;
    amount: number;
    category_id: string | null;
    due_day: number;
    installment?: { total: number; start_month: number; start_year: number };
  }) => Promise<void>;
  onUpdate: (data: {
    id: string;
    name: string;
    amount: number;
    category_id: string | null;
    due_day: number;
  }) => Promise<void>;
  onDelete: (id: string, groupId?: string) => Promise<void>;
  onPay: (bill_id: string, date: string) => Promise<void>;
  onUnpay: (transaction_id: string) => Promise<void>;
}


function BillFormDialog({
  categories,
  initial,
  currentDate,
  onSubmit,
  onClose,
}: {
  categories: Category[];
  initial?: BillTemplate | null;
  currentDate: { year: number; month: number };
  onSubmit: (data: {
    name: string;
    amount: number;
    category_id: string | null;
    due_day: number;
    installment?: { total: number; start_month: number; start_year: number };
  }) => Promise<void>;
  onClose: () => void;
}) {
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    amount: initial?.amount ? String(initial.amount) : "",
    category_id: initial?.category_id ?? "",
    due_day: initial?.due_day ? String(initial.due_day) : "",
  });
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [loading, setLoading] = useState(false);

  const allInstallmentMonths = Array.from({ length: installmentCount }, (_, i) => {
    const offset = currentDate.month - 1 + i;
    return MONTHS_PT[offset % 12];
  });
  const installmentMonthsPreview = installmentCount <= 4
    ? allInstallmentMonths.join(" · ")
    : allInstallmentMonths.slice(0, 3).join(" · ") + ` · +${installmentCount - 3} meses`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount.replace(",", "."));
    const due_day = parseInt(form.due_day, 10);
    if (!form.name || isNaN(amount) || amount <= 0 || isNaN(due_day) || due_day < 1 || due_day > 31) return;
    setLoading(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        amount,
        category_id: form.category_id || null,
        due_day,
        installment: isInstallment && !initial
          ? { total: installmentCount, start_month: currentDate.month, start_year: currentDate.year }
          : undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-5">
        <h3 className="text-base font-heading font-bold">
          {initial ? "Editar Conta" : "Nova Conta"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ex: Netflix, Prestação carro..."
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valor</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0,00"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dia venc.</label>
              <input
                required
                type="number"
                min="1"
                max="31"
                value={form.due_day}
                onChange={(e) => setForm((f) => ({ ...f, due_day: e.target.value }))}
                placeholder="ex: 5"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categoria</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="">Sem categoria</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Installment toggle — only for new bills */}
          {!initial && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsInstallment((v) => !v)}
                className={`w-full flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isInstallment
                    ? "border-brand bg-brand/8 text-brand"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Layers className="size-4" />
                  Parcelado
                </span>
                <span className={`size-4 rounded border-2 flex items-center justify-center transition-colors ${isInstallment ? "border-brand bg-brand" : "border-border"}`}>
                  {isInstallment && <span className="block size-2 rounded-sm bg-white" />}
                </span>
              </button>

              {isInstallment && (
                <div className="rounded-xl bg-surface border border-border px-4 py-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nº de parcelas</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInstallmentCount((n) => Math.max(2, n - 1))}
                        className="size-7 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-bold"
                      >−</button>
                      <span className="w-8 text-center text-sm font-bold tabular-nums">{installmentCount}x</span>
                      <button
                        type="button"
                        onClick={() => setInstallmentCount((n) => Math.min(60, n + 1))}
                        className="size-7 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-bold"
                      >+</button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{installmentMonthsPreview}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-surface transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? "A guardar..." : initial ? "Guardar" : isInstallment ? `Criar ${installmentCount}x` : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BillsSection({
  bills,
  categories,
  currentDate,
  onAdd,
  onUpdate,
  onDelete,
  onPay,
  onUnpay,
}: BillsSectionProps) {
  const { fmt } = useCurrency();
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<BillTemplate | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [unpayingId, setUnpayingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BillWithStatus | null>(null);

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === currentDate.year &&
    today.getMonth() + 1 === currentDate.month;

  const payDate = isCurrentMonth
    ? today.toISOString().slice(0, 10)
    : new Date(currentDate.year, currentDate.month - 1, 28)
        .toISOString()
        .slice(0, 10);

  const handlePay = async (bill: BillWithStatus) => {
    setPayingId(bill.id);
    try {
      await onPay(bill.id, payDate);
    } finally {
      setPayingId(null);
    }
  };

  const handleUnpay = async (bill: BillWithStatus) => {
    if (!bill.paid_transaction_id) return;
    setUnpayingId(bill.id);
    try {
      await onUnpay(bill.paid_transaction_id);
    } finally {
      setUnpayingId(null);
    }
  };

  const handleDelete = (bill: BillWithStatus) => {
    if (bill.is_installment) {
      setDeleteTarget(bill);
    } else {
      if (!confirm(`Remover "${bill.name}" das contas recorrentes?`)) return;
      onDelete(bill.id);
    }
  };

  const paidCount = bills.filter((b) => b.paid_transaction_id).length;
  const totalPending = bills
    .filter((b) => !b.paid_transaction_id)
    .reduce((s, b) => s + Number(b.amount), 0);

  if (bills.length === 0) {
    return (
      <>
        <div className="bg-card rounded-2xl border border-border card-shadow p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
              <CalendarCheck className="size-4 text-brand" />
            </div>
            <div>
              <p className="text-sm font-heading font-semibold">Contas Recorrentes</p>
              <p className="text-xs text-muted-foreground">Adiciona as tuas contas fixas mensais</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="size-3.5" />
            Adicionar
          </button>
        </div>
        {showForm && (
          <BillFormDialog
            categories={categories}
            currentDate={currentDate}
            onSubmit={onAdd}
            onClose={() => setShowForm(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="bg-card rounded-2xl border border-border card-shadow overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="size-7 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
            <CalendarCheck className="size-3.5 text-brand" />
          </div>
          <span className="text-sm font-heading font-semibold">Contas do Mês</span>
          <span className="text-[11px] font-semibold text-muted-foreground bg-surface border border-border/60 px-2 py-0.5 rounded-full">
            {paidCount}/{bills.length} pagas
          </span>
          {totalPending > 0 && (
            <span className="text-[11px] font-semibold text-expense bg-expense/8 px-2 py-0.5 rounded-full ml-auto mr-0">
              {fmt(totalPending)} por pagar
            </span>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-1 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/15 transition-colors"
          >
            <Plus className="size-3" />
            Nova
          </button>
        </div>

        {/* Bills list */}
        <div className="divide-y divide-border/50">
          {bills.map((bill) => {
            const isPaid = !!bill.paid_transaction_id;
            const isOverdue = bill.is_overdue;

            let rowBg = "";
            let iconEl: React.ReactNode;
            let statusBadge: React.ReactNode;

            if (isPaid) {
              rowBg = "bg-income/[0.04]";
              iconEl = <CheckCircle2 className="size-4 text-income" />;
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-income/10 text-income">
                  Pago
                </span>
              );
            } else if (isOverdue) {
              rowBg = "bg-expense/[0.06]";
              iconEl = <AlertCircle className="size-4 text-expense" />;
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-expense/12 text-expense">
                  Atrasado
                </span>
              );
            } else {
              rowBg = "bg-[#fff3f3] dark:bg-expense/[0.05]";
              iconEl = <Clock className="size-4 text-expense/70" />;
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-expense/8 text-expense/80">
                  Pendente
                </span>
              );
            }

            return (
              <div
                key={bill.id}
                className={`${rowBg} px-5 py-3.5 flex items-center gap-3 group transition-colors`}
              >
                <div className="shrink-0">{iconEl}</div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">{bill.name}</span>
                    {bill.is_installment && bill.installment_current && bill.installment_total && (
                      <span className="px-2 py-0.5 bg-brand/10 text-brand rounded-full text-[10px] font-semibold">
                        {bill.installment_current}/{bill.installment_total}
                      </span>
                    )}
                    {bill.category && (
                      <span className="px-2 py-0.5 bg-surface text-muted-foreground rounded-full text-[10px] font-medium border border-border/50">
                        {bill.category.name}
                      </span>
                    )}
                    {statusBadge}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    vence dia {bill.due_day}
                  </p>
                </div>

                {/* Amount */}
                <span className="text-sm font-bold tabular-nums text-foreground shrink-0">
                  {fmt(bill.amount)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isPaid ? (
                    <button
                      onClick={() => handleUnpay(bill)}
                      disabled={unpayingId === bill.id}
                      title="Desfazer pagamento"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-surface border border-border/50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
                    >
                      <Undo2 className="size-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePay(bill)}
                      disabled={payingId === bill.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-income hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
                    >
                      {payingId === bill.id ? "..." : "Pagar"}
                    </button>
                  )}
                  <button
                    onClick={() => setEditingBill(bill)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/8 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Editar"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(bill)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-expense hover:bg-expense/8 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remover"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <BillFormDialog
          categories={categories}
          currentDate={currentDate}
          onSubmit={onAdd}
          onClose={() => setShowForm(false)}
        />
      )}
      {editingBill && (
        <BillFormDialog
          categories={categories}
          currentDate={currentDate}
          initial={editingBill}
          onSubmit={(d) => onUpdate({ id: editingBill.id, ...d })}
          onClose={() => setEditingBill(null)}
        />
      )}

      {/* Delete installment dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-heading font-bold">Remover parcela</h3>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">"{deleteTarget.name}"</span> é uma conta parcelada ({deleteTarget.installment_current}/{deleteTarget.installment_total}). O que pretendes fazer?
            </p>
            <div className="space-y-2 pt-1">
              <button
                onClick={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface transition-colors text-left"
              >
                Remover só esta parcela ({deleteTarget.installment_current}/{deleteTarget.installment_total})
              </button>
              <button
                onClick={() => { onDelete(deleteTarget.id, deleteTarget.installment_group_id ?? undefined); setDeleteTarget(null); }}
                className="w-full rounded-xl border border-expense/30 bg-expense/5 px-4 py-2.5 text-sm font-semibold text-expense hover:bg-expense/10 transition-colors text-left"
              >
                Remover todas as {deleteTarget.installment_total} parcelas
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
