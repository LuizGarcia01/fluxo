import { useState } from "react";
import { Moon, Sun, LogOut, ChevronDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  currentDate: { year: number; month: number };
  onChangeDate: (date: { year: number; month: number }) => void;
}

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function Header({ currentDate, onChangeDate }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("fluxo-theme", next ? "dark" : "light");
  };

  const handleYearChange = (value: number) => {
    const clamped = Math.min(Math.max(value, 2000), 2099);
    onChangeDate({ ...currentDate, year: clamped });
  };

  return (
    <header className="flex justify-between items-center pb-6 border-b border-border">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center shadow-md"
          style={{
            background: "linear-gradient(140deg, #7ab4ad, #3d8a84)",
            boxShadow: "0 4px 12px -2px #7ab4ad55",
          }}
        >
          <TrendingUp className="size-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-base font-heading font-semibold tracking-tight leading-none">Fluxo</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">Orçamento pessoal</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Month selector */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hidden sm:flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold border border-border bg-card hover:bg-surface transition-colors card-shadow"
          >
            <span className="text-foreground">{months[currentDate.month - 1]}</span>
            <span className="text-muted-foreground font-normal">{currentDate.year}</span>
            <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-2xl border border-border p-4 z-20 space-y-3" style={{ boxShadow: "0 8px 32px -4px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Ano</label>
                  <input
                    type="number"
                    value={currentDate.year}
                    min={2000}
                    max={2099}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Mês</label>
                  <select
                    value={currentDate.month}
                    onChange={(e) => {
                      onChangeDate({ ...currentDate, month: Number(e.target.value) });
                      setIsOpen(false);
                    }}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-colors"
                  >
                    {months.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="size-10 rounded-xl border border-border bg-card hover:bg-surface flex items-center justify-center transition-colors card-shadow"
          aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          {isDark
            ? <Sun className="size-4 text-muted-foreground" />
            : <Moon className="size-4 text-muted-foreground" />}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="size-10 rounded-xl border border-border bg-card hover:bg-surface flex items-center justify-center transition-colors card-shadow group"
          aria-label="Sair"
        >
          <LogOut className="size-4 text-muted-foreground group-hover:text-expense transition-colors" />
        </button>
      </div>
    </header>
  );
}
