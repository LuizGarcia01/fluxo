import { useState, useEffect } from "react";
import { Plus, X, Pencil, Layers } from "lucide-react";
import type { Category, Transaction, TransactionType } from "@/lib/budget.types";
import { useCurrency } from "@/contexts/CurrencyContext";

const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

interface AddTransactionDialogProps {
  categories: Category[];
  currentDate: { year: number; month: number };
  onSubmit: (data: {
    type: TransactionType;
    categoryId: string | null;
    amount: number;
    description: string;
    date: string;
    installmentTotal?: number;
  }) => Promise<void>;
  editingTransaction?: Transaction | null;
  onClose?: () => void;
  /** Controlled open state — when provided the internal button trigger is hidden */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddTransactionDialog({
  categories,
  currentDate,
  onSubmit,
  editingTransaction,
  onClose,
  open: controlledOpen,
  onOpenChange,
}: AddTransactionDialogProps) {
  const { symbol } = useCurrency();
  const isEdit = !!editingTransaction;
  const [internalOpen, setInternalOpen] = useState(isEdit);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [loading, setLoading] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);

  const defaultDate = `${currentDate.year}-${String(currentDate.month).padStart(2, "0")}-${new Date().getDate().toString().padStart(2, "0")}`;

  const [type, setType] = useState<TransactionType>(editingTransaction?.type ?? "expense");
  const [categoryId, setCategoryId] = useState<string>(editingTransaction?.category_id ?? "");
  const [amount, setAmount] = useState(editingTransaction ? String(editingTransaction.amount) : "");
  const [description, setDescription] = useState(editingTransaction?.description ?? "");
  const [date, setDate] = useState(editingTransaction?.date ?? defaultDate);

  useEffect(() => {
    if (editingTransaction) {
      setIsOpen(true);
      setType(editingTransaction.type);
      setCategoryId(editingTransaction.category_id ?? "");
      setAmount(String(editingTransaction.amount));
      setDescription(editingTransaction.description);
      setDate(editingTransaction.date);
    }
  }, [editingTransaction]);

  const filteredCategories = categories.filter((c) => c.type === type);

  const close = () => {
    setIsOpen(false);
    setAmount("");
    setDescription("");
    setCategoryId("");
    setType("expense");
    setDate(defaultDate);
    setIsInstallment(false);
    setInstallmentCount(2);
    onClose?.();
  };

  const installmentStartMonth = date ? new Date(date + "T00:00:00").getMonth() : currentDate.month - 1;
  const installmentStartYear = date ? new Date(date + "T00:00:00").getFullYear() : currentDate.year;
  const installmentPreview = (() => {
    const months = Array.from({ length: installmentCount }, (_, i) => {
      const offset = installmentStartMonth + i;
      return MONTHS_PT[offset % 12];
    });
    return installmentCount <= 4
      ? months.join(" · ")
      : months.slice(0, 3).join(" · ") + ` · +${installmentCount - 3} meses`;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        type,
        categoryId: categoryId || null,
        amount: Number(amount.replace(",", ".")),
        description,
        date,
        installmentTotal: !isEdit && isInstallment ? installmentCount : undefined,
      });
      close();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isEdit && controlledOpen === undefined && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-brand text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm shadow-brand/30"
        >
          <Plus className="size-4" />
          Novo Lançamento
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
          onClick={(e) => e.currentTarget === e.target && close()}
        >
          <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl shadow-foreground/10 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`size-8 rounded-xl flex items-center justify-center ${isEdit ? "bg-brand/10" : "bg-brand/10"}`}>
                  {isEdit ? <Pencil className="size-3.5 text-brand" /> : <Plus className="size-3.5 text-brand" />}
                </div>
                <h2 className="text-base font-heading font-bold">
                  {isEdit ? "Editar Lançamento" : "Novo Lançamento"}
                </h2>
              </div>
              <button
                onClick={close}
                className="size-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Type toggle */}
              <div className="flex bg-surface p-1 rounded-xl gap-1">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); setCategoryId(""); }}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                      type === t
                        ? t === "expense"
                          ? "bg-card shadow-sm text-expense"
                          : "bg-card shadow-sm text-income"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "expense" ? "Despesa" : "Entrada"}
                  </button>
                ))}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Descrição</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Ex: Supermercado"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-colors placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Valor ({symbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="0,00"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-colors placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-colors"
                >
                  <option value="">Sem categoria</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ${c.name}` : c.name}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-colors"
                />
              </div>

              {/* Installment toggle — only for new transactions */}
              {!isEdit && (
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
                        <span className="font-semibold text-foreground">{installmentPreview}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 rounded-xl bg-brand py-3 text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm shadow-brand/30"
              >
                {loading ? "Salvando..." : isEdit ? "Salvar Alterações" : isInstallment ? `Adicionar ${installmentCount}x` : "Adicionar Lançamento"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

