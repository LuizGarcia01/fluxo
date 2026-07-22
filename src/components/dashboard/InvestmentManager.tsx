import { useState } from "react";
import { TrendingUp, X, Trash2, Pencil, Check, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { Investment, InvestmentContribution, InvestmentType } from "@/lib/budget.types";

interface InvestmentManagerProps {
  investments: Investment[];
  contributions: InvestmentContribution[];
  onAddInvestment: (data: { name: string; type: InvestmentType; current_value: number }) => Promise<void> | void;
  onUpdateInvestment: (data: { id: string; name: string; type: InvestmentType; current_value: number }) => Promise<void> | void;
  onDeleteInvestment: (id: string) => Promise<void> | void;
  onAddContribution: (data: {
    investment_id: string;
    amount: number;
    date: string;
    notes: string | null;
    linkToCashflow: boolean;
  }) => Promise<void> | void;
  onDeleteContribution: (id: string) => Promise<void> | void;
  inline?: boolean;
}


const TYPE_LABELS: Record<InvestmentType, string> = {
  renda_fixa: "Renda Fixa",
  acoes: "Ações",
  fii: "FIIs",
  cripto: "Cripto",
  outros: "Outros",
};

const TYPE_OPTIONS: InvestmentType[] = ["renda_fixa", "acoes", "fii", "cripto", "outros"];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

export function InvestmentManager({
  investments,
  contributions,
  onAddInvestment,
  onUpdateInvestment,
  onDeleteInvestment,
  onAddContribution,
  onDeleteContribution,
  inline = false,
}: InvestmentManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"list" | "new" | "contribute">(inline ? "new" : "list");


  // New investment form
  const [name, setName] = useState("");
  const [type, setType] = useState<InvestmentType>("renda_fixa");
  const [currentValue, setCurrentValue] = useState("");

  // Contribution form
  const [contribInvestmentId, setContribInvestmentId] = useState("");
  const [contribKind, setContribKind] = useState<"aporte" | "retirada">("aporte");
  const [contribAmount, setContribAmount] = useState("");
  const [contribDate, setContribDate] = useState(new Date().toISOString().slice(0, 10));
  const [contribNotes, setContribNotes] = useState("");
  const [linkToCashflow, setLinkToCashflow] = useState(true);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<InvestmentType>("renda_fixa");
  const [editValue, setEditValue] = useState("");

  const totalPatrimony = investments.reduce((s, i) => s + Number(i.current_value), 0);

  const submitInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onAddInvestment({
      name: name.trim(),
      type,
      current_value: Number(currentValue.replace(",", ".") || 0),
    });
    setName(""); setCurrentValue(""); setType("renda_fixa");
    setTab("list");
  };

  const submitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribInvestmentId) return;
    const raw = Number(contribAmount.replace(",", "."));
    if (!raw || raw <= 0) return;
    await onAddContribution({
      investment_id: contribInvestmentId,
      amount: contribKind === "aporte" ? raw : -raw,
      date: contribDate,
      notes: contribNotes.trim() || null,
      linkToCashflow,
    });
    setContribInvestmentId(""); setContribAmount(""); setContribNotes("");
    setContribKind("aporte"); setLinkToCashflow(true);
    setTab("list");
  };

  const startEdit = (inv: Investment) => {
    setEditingId(inv.id);
    setEditName(inv.name);
    setEditType(inv.type);
    setEditValue(String(inv.current_value));
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await onUpdateInvestment({
      id,
      name: editName.trim(),
      type: editType,
      current_value: Number(editValue.replace(",", ".") || 0),
    });
    setEditingId(null);
  };

  const handleDeleteInv = async (id: string) => {
    if (!confirm("Excluir este investimento? Os aportes vinculados também serão removidos.")) return;
    await onDeleteInvestment(id);
  };

  const body = (
    <>
      <div className="flex bg-surface p-0.5 rounded-lg">

              {(["list", "new", "contribute"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    tab === t ? "bg-white shadow-sm text-brand" : "text-brand/50"
                  }`}
                >
                  {t === "list" ? "Ativos" : t === "new" ? "Novo ativo" : "Aporte/Retirada"}
                </button>
              ))}
            </div>

            {tab === "new" && (
              <form onSubmit={submitInvestment} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand/40">Nome</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-brand/10 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand/30 focus:ring-2 focus:ring-brand/10"
                    placeholder="Ex: Tesouro Selic, ITSA4, Bitcoin"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand/40">Tipo</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TYPE_OPTIONS.map((t) => (
                      <button
                        key={t} type="button" onClick={() => setType(t)}
                        className={`px-2 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                          type === t ? "border-brand/40 bg-brand/5 text-brand" : "border-brand/10 bg-surface text-brand/50"
                        }`}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand/40">Valor atual</label>
                  <input
                    type="text" inputMode="decimal"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="w-full rounded-xl border border-brand/10 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand/30 focus:ring-2 focus:ring-brand/10 tabular-nums"
                    placeholder="0,00"
                  />
                  <p className="text-[10px] text-brand/40">Você pode atualizar esse valor a qualquer momento.</p>
                </div>
                <button type="submit" className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-primary-foreground hover:opacity-90">
                  Adicionar Investimento
                </button>
              </form>
            )}

            {tab === "contribute" && (
              <form onSubmit={submitContribution} className="space-y-4">
                {investments.length === 0 ? (
                  <p className="text-sm text-brand/50">Cadastre um investimento antes de registrar aportes.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-brand/40">Investimento</label>
                      <select
                        value={contribInvestmentId} onChange={(e) => setContribInvestmentId(e.target.value)} required
                        className="w-full rounded-xl border border-brand/10 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand/30 focus:ring-2 focus:ring-brand/10"
                      >
                        <option value="">Selecione…</option>
                        {investments.map((i) => (
                          <option key={i.id} value={i.id}>{i.name} — {TYPE_LABELS[i.type]}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex bg-surface p-0.5 rounded-lg">
                      <button
                        type="button" onClick={() => setContribKind("aporte")}
                        className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md ${contribKind === "aporte" ? "bg-white shadow-sm text-income" : "text-brand/50"}`}
                      >
                        <ArrowUpRight className="inline size-3 mr-1" />Aporte
                      </button>
                      <button
                        type="button" onClick={() => setContribKind("retirada")}
                        className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md ${contribKind === "retirada" ? "bg-white shadow-sm text-expense" : "text-brand/50"}`}
                      >
                        <ArrowDownRight className="inline size-3 mr-1" />Retirada
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-brand/40">Valor</label>
                        <input
                          type="text" inputMode="decimal" required
                          value={contribAmount} onChange={(e) => setContribAmount(e.target.value)}
                          className="w-full rounded-xl border border-brand/10 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand/30 tabular-nums"
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-brand/40">Data</label>
                        <input
                          type="date" required
                          value={contribDate} onChange={(e) => setContribDate(e.target.value)}
                          className="w-full rounded-xl border border-brand/10 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand/30"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-brand/40">Observação</label>
                      <input
                        value={contribNotes} onChange={(e) => setContribNotes(e.target.value)}
                        className="w-full rounded-xl border border-brand/10 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand/30"
                        placeholder="Opcional"
                      />
                    </div>

                    <label className="flex items-start gap-2.5 p-3 bg-surface rounded-xl cursor-pointer">
                      <input
                        type="checkbox" checked={linkToCashflow}
                        onChange={(e) => setLinkToCashflow(e.target.checked)}
                        className="mt-0.5 accent-brand"
                      />
                      <span className="text-xs text-brand/70">
                        <span className="font-semibold text-brand">Lançar no fluxo do mês</span><br />
                        {contribKind === "aporte"
                          ? "Registra o aporte como uma despesa do mês (dinheiro que saiu do caixa)."
                          : "Registra a retirada como uma entrada do mês (dinheiro que voltou pro caixa)."}
                      </span>
                    </label>

                    <button type="submit" className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-primary-foreground hover:opacity-90">
                      Registrar
                    </button>
                  </>
                )}
              </form>
            )}

            {tab === "list" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {investments.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <p className="text-sm text-brand/50">Nenhum investimento cadastrado.</p>
                      <button
                        onClick={() => setTab("new")}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:opacity-70"
                      >
                        <Plus className="size-3" /> Cadastrar primeiro ativo
                      </button>
                    </div>
                  ) : (
                    investments.map((inv) => (
                      <div key={inv.id} className="p-3 bg-surface rounded-xl">
                        {editingId === inv.id ? (
                          <div className="space-y-2">
                            <input
                              value={editName} onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded-lg border border-brand/10 bg-white px-2 py-1 text-sm outline-none focus:border-brand/30"
                            />
                            <div className="flex gap-2">
                              <select
                                value={editType} onChange={(e) => setEditType(e.target.value as InvestmentType)}
                                className="flex-1 rounded-lg border border-brand/10 bg-white px-2 py-1 text-xs"
                              >
                                {TYPE_OPTIONS.map((t) => (
                                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                                ))}
                              </select>
                              <input
                                type="text" inputMode="decimal"
                                value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                className="flex-1 rounded-lg border border-brand/10 bg-white px-2 py-1 text-xs tabular-nums"
                                placeholder="Valor atual"
                              />
                              <button onClick={() => saveEdit(inv.id)} aria-label="Salvar" className="p-1.5 text-income hover:bg-income/10 rounded-lg">
                                <Check className="size-4" />
                              </button>
                              <button onClick={cancelEdit} aria-label="Cancelar" className="p-1.5 text-brand/40 hover:bg-brand/5 rounded-lg">
                                <X className="size-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold truncate">{inv.name}</span>
                                <span className="px-1.5 py-[1px] rounded text-[9px] font-semibold uppercase tracking-wider bg-brand/8 text-brand">
                                  {TYPE_LABELS[inv.type]}
                                </span>
                              </div>
                              <p className="text-xs text-brand/50 tabular-nums">{formatCurrency(Number(inv.current_value))}</p>
                            </div>
                            <button onClick={() => startEdit(inv)} aria-label="Editar" className="p-1.5 text-brand/40 hover:text-brand hover:bg-brand/5 rounded-lg">
                              <Pencil className="size-3.5" />
                            </button>
                            <button onClick={() => handleDeleteInv(inv.id)} aria-label="Excluir" className="p-1.5 text-brand/40 hover:text-expense hover:bg-expense/10 rounded-lg">
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {contributions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand/40">Aportes/Retiradas do mês</p>
                    <div className="space-y-1.5">
                      {contributions.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg">
                          <div className={`size-6 rounded-md grid place-items-center ${c.amount >= 0 ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                            {c.amount >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{c.investment?.name ?? "—"}</p>
                            <p className="text-[10px] text-brand/50 tabular-nums">
                              {new Date(c.date + "T00:00:00").toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                              {c.transaction_id && <span className="ml-1.5 text-brand/40">· vinculado ao fluxo</span>}
                            </p>
                          </div>
                          <span className={`text-xs font-semibold tabular-nums ${c.amount >= 0 ? "text-income" : "text-expense"}`}>
                            {c.amount >= 0 ? "+" : "−"} {formatCurrency(Math.abs(Number(c.amount)))}
                          </span>
                          <button
                            onClick={() => onDeleteContribution(c.id)}
                            aria-label="Excluir"
                            className="p-1 text-brand/30 hover:text-expense"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
              )}
            </div>
          )}
    </>
  );

  if (inline) {
    return <div className="space-y-5">{body}</div>;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs font-bold uppercase tracking-widest text-brand/40 hover:text-brand transition-colors flex items-center gap-1"
      >
        <TrendingUp className="size-3" /> Investimentos
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand/20 backdrop-blur-sm"
          onClick={(e) => e.currentTarget === e.target && setIsOpen(false)}
        >
          <div className="w-full max-w-lg bg-white rounded-3xl border border-brand/5 shadow-xl p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-heading font-bold">Investimentos</h2>
                <p className="text-[11px] text-brand/50 tabular-nums">
                  Patrimônio total: <span className="font-semibold text-brand">{formatCurrency(totalPatrimony)}</span>
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} aria-label="Fechar" className="p-2 text-brand/40 hover:text-brand">
                <X className="size-5" />
              </button>
            </div>
            {body}
          </div>
        </div>
      )}
    </>
  );
}



