import { useState } from "react";
import { Tag, X, Pencil, Trash2, Check } from "lucide-react";
import type { Category, TransactionType, ExpenseKind } from "@/lib/budget.types";

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (data: { name: string; type: TransactionType; expense_kind: ExpenseKind | null; icon: string | null }) => void;
  onUpdate: (data: { id: string; name: string; type: TransactionType; expense_kind: ExpenseKind | null; icon: string | null }) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

type CategoryClass = "income" | "fixed" | "variable";

const CLASS_OPTIONS: { value: CategoryClass; label: string; hint: string }[] = [
  { value: "income", label: "Entrada", hint: "Salário, vendas, rendimentos" },
  { value: "fixed", label: "Despesa fixa", hint: "Aluguel, assinatura, mensalidade" },
  { value: "variable", label: "Despesa variável", hint: "Mercado, lazer, transporte" },
];

// Emojis organized by context — shows relevant set based on selected type
const EMOJI_BY_CLASS: Record<CategoryClass, string[]> = {
  income: ["💰", "💵", "💳", "💼", "📊", "📈", "💹", "🏦", "🎁", "🏆", "💲", "🤑", "📑", "🏧"],
  fixed: ["🏠", "🏡", "🔑", "🔌", "💡", "📱", "🌐", "📺", "🚿", "⚡", "🔥", "🛡️", "🏋️", "🎓"],
  variable: [
    "🛒", "🍕", "🍔", "🍽️", "☕", "🥗", "🍺", "🧃",
    "🚗", "⛽", "✈️", "🚌", "🚇", "🛵",
    "💊", "🏥", "🧘", "🦷", "👓",
    "🎬", "🎮", "🎵", "📚", "🎯", "🎭",
    "👕", "👗", "👟", "💄", "🛍️",
    "🐕", "🐈", "🌿", "📦", "🎀",
  ],
};

function toClass(cat: Pick<Category, "type" | "expense_kind">): CategoryClass | null {
  if (cat.type === "income") return "income";
  if (cat.expense_kind === "fixed") return "fixed";
  if (cat.expense_kind === "variable") return "variable";
  return null;
}

function fromClass(c: CategoryClass): { type: TransactionType; expense_kind: ExpenseKind | null } {
  if (c === "income") return { type: "income", expense_kind: null };
  return { type: "expense", expense_kind: c };
}

function classBadge(c: CategoryClass | null) {
  if (c === "income")
    return <span className="px-2 py-[2px] rounded-md text-[10px] font-semibold bg-income/10 text-income">Entrada</span>;
  if (c === "fixed")
    return <span className="px-2 py-[2px] rounded-md text-[10px] font-semibold bg-brand/8 text-brand">Despesa fixa</span>;
  if (c === "variable")
    return <span className="px-2 py-[2px] rounded-md text-[10px] font-semibold bg-expense/10 text-expense">Despesa variável</span>;
  return <span className="px-2 py-[2px] rounded-md text-[10px] font-semibold bg-surface text-muted-foreground/70">Sem classe</span>;
}

function EmojiPicker({
  value,
  onChange,
  klass,
}: {
  value: string;
  onChange: (v: string) => void;
  klass: CategoryClass;
}) {
  const emojis = EMOJI_BY_CLASS[klass];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-widest text-brand/40">Ícone</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] text-brand/40 hover:text-brand/70"
          >
            Remover
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji === value ? "" : emoji)}
            className={`size-8 rounded-lg text-lg flex items-center justify-center transition-all ${
              value === emoji
                ? "bg-brand/15 ring-2 ring-brand/40 scale-110"
                : "bg-surface hover:bg-brand/5 hover:scale-110"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CategoryManager({ categories, onAdd, onUpdate, onDelete }: CategoryManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [klass, setKlass] = useState<CategoryClass>("variable");
  const [icon, setIcon] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKlass, setEditKlass] = useState<CategoryClass>("variable");
  const [editIcon, setEditIcon] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), icon: icon || null, ...fromClass(klass) });
    setName("");
    setIcon("");
    setKlass("variable");
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditKlass(toClass(cat) ?? "variable");
    setEditIcon(cat.icon ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditIcon("");
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await onUpdate({ id, name: editName.trim(), icon: editIcon || null, ...fromClass(editKlass) });
    cancelEdit();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta categoria? Lançamentos vinculados ficarão sem categoria.")) return;
    await onDelete(id);
  };

  const grouped = {
    income: categories.filter((c) => toClass(c) === "income"),
    fixed: categories.filter((c) => toClass(c) === "fixed"),
    variable: categories.filter((c) => toClass(c) === "variable"),
    none: categories.filter((c) => toClass(c) === null),
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs font-bold uppercase tracking-widest text-brand/40 hover:text-brand transition-colors flex items-center gap-1"
      >
        <Tag className="size-3" /> Categorias
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand/20 backdrop-blur-sm"
          onClick={(e) => e.currentTarget === e.target && setIsOpen(false)}
        >
          <div className="w-full max-w-md bg-white rounded-3xl border border-brand/5 shadow-xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold">Gerenciar Categorias</h2>
              <button onClick={() => setIsOpen(false)} aria-label="Fechar" className="p-2 text-brand/40 hover:text-brand">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-brand/40">Nova categoria</label>
                <div className="flex items-center gap-2">
                  {icon && (
                    <span className="text-2xl leading-none shrink-0">{icon}</span>
                  )}
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="flex-1 rounded-xl border border-brand/10 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand/30 focus:ring-2 focus:ring-brand/10"
                    placeholder="Ex: Aluguel, Mercado, Salário…"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-brand/40">Tipo</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {CLASS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setKlass(opt.value); setIcon(""); }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-colors ${
                        klass === opt.value
                          ? "border-brand/40 bg-brand/5"
                          : "border-brand/10 bg-surface hover:border-brand/20"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-brand">{opt.label}</div>
                        <div className="text-[11px] text-brand/50">{opt.hint}</div>
                      </div>
                      <div className={`size-4 rounded-full border-2 ${klass === opt.value ? "border-brand bg-brand" : "border-brand/20"}`} />
                    </button>
                  ))}
                </div>
              </div>

              <EmojiPicker value={icon} onChange={setIcon} klass={klass} />

              <button
                type="submit"
                className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Adicionar Categoria
              </button>
            </form>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-brand/40">Suas categorias</p>
              {categories.length === 0 && (
                <p className="text-sm text-brand/40">Nenhuma categoria cadastrada.</p>
              )}

              {(["income", "fixed", "variable", "none"] as const).map((section) => {
                const list = grouped[section];
                if (list.length === 0) return null;
                const label =
                  section === "income" ? "Entradas"
                  : section === "fixed" ? "Despesas fixas"
                  : section === "variable" ? "Despesas variáveis"
                  : "Sem classe";
                return (
                  <div key={section} className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand/40">{label}</p>
                    {list.map((cat) => (
                      <div key={cat.id} className="px-3 py-2 bg-surface rounded-xl">
                        {editingId === cat.id ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              {editIcon && (
                                <span className="text-xl leading-none shrink-0">{editIcon}</span>
                              )}
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 rounded-lg border border-brand/10 bg-white px-2 py-1 text-sm outline-none focus:border-brand/30"
                                autoFocus
                              />
                              <button onClick={() => saveEdit(cat.id)} aria-label="Salvar" className="p-1.5 text-income hover:bg-income/10 rounded-lg">
                                <Check className="size-4" />
                              </button>
                              <button onClick={cancelEdit} aria-label="Cancelar" className="p-1.5 text-brand/40 hover:bg-brand/5 rounded-lg">
                                <X className="size-4" />
                              </button>
                            </div>
                            <select
                              value={editKlass}
                              onChange={(e) => { setEditKlass(e.target.value as CategoryClass); setEditIcon(""); }}
                              className="w-full rounded-lg border border-brand/10 bg-white px-2 py-1.5 text-xs"
                            >
                              {CLASS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <EmojiPicker value={editIcon} onChange={setEditIcon} klass={editKlass} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {cat.icon && (
                              <span className="text-lg leading-none shrink-0">{cat.icon}</span>
                            )}
                            <span className="flex-1 text-sm font-medium truncate">{cat.name}</span>
                            {classBadge(toClass(cat))}
                            <button
                              onClick={() => startEdit(cat)}
                              aria-label="Editar"
                              className="p-1.5 text-brand/40 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id)}
                              aria-label="Excluir"
                              className="p-1.5 text-brand/40 hover:text-expense hover:bg-expense/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
