import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Nexo" },
      { name: "description", content: "Entre na sua conta do Nexo." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          if (error.status === 422) {
            setMessage("Este e-mail já foi cadastrado. Entre na sua conta ou verifique sua caixa de spam pelo link de confirmação.");
          } else {
            throw error;
          }
        } else {
          setMessage("Conta criada! Se não receber o e-mail de confirmação, verifique o spam — ou entre direto se a confirmação estiver desativada.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.status === 400) {
            setError("E-mail ou senha incorretos. Se acabou de se cadastrar, confirme seu e-mail primeiro.");
          } else {
            throw error;
          }
        } else {
          const pendingToken = localStorage.getItem("nexo-pending-invite");
          if (pendingToken) {
            localStorage.removeItem("nexo-pending-invite");
            navigate({ to: "/join", search: { token: pendingToken } });
          } else {
            navigate({ to: "/" });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #6ec6ba 0%, #3eaaa0 50%, #1d8880 100%)",
        }}
      >
        {/* Mesh glow blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-25"
            style={{ background: "radial-gradient(circle, oklch(0.65 0.18 145), transparent 70%)" }}
          />
          <div
            className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, oklch(0.55 0.20 160), transparent 70%)" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, oklch(0.80 0.15 130), transparent 70%)" }}
          />
        </div>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3 mb-14">
            <div
              className="size-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "oklch(0.65 0.18 145 / 0.30)", border: "1px solid oklch(1 0 0 / 0.20)" }}
            >
              <span className="text-white text-sm font-semibold">₢</span>
            </div>
            <span className="text-white font-heading font-semibold text-xl tracking-tight">nexo</span>
          </div>
          <div className="space-y-5">
            <h2 className="text-[2.6rem] font-heading font-semibold text-white leading-[1.12] tracking-tight">
              Controle total<br />das suas finanças
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed max-w-xs">
              Registre entradas, despesas e investimentos. Acompanhe seu patrimônio mês a mês.
            </p>
          </div>
        </div>

        <div className="relative flex flex-col gap-3.5">
          {[
            { icon: "↑", label: "Entradas & Despesas", value: "Categorize cada transação" },
            { icon: "◈", label: "Investimentos", value: "Patrimônio em tempo real" },
            { icon: "▨", label: "Relatórios", value: "Visualize sua evolução" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3.5">
              <div
                className="size-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-semibold text-white"
                style={{ background: "oklch(1 0 0 / 0.10)", border: "1px solid oklch(1 0 0 / 0.12)" }}
              >
                {item.icon}
              </div>
              <div>
                <p className="text-white text-[13px] font-semibold leading-none mb-0.5">{item.label}</p>
                <p className="text-white/45 text-[12px] leading-none">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="size-8 bg-brand rounded-xl flex items-center justify-center shadow-sm shadow-brand/30">
              <span className="text-white text-xs font-semibold">₢</span>
            </div>
            <span className="font-heading font-semibold text-base tracking-tight">nexo</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-heading font-semibold tracking-tight">
              {isSignUp ? "Criar conta" : "Bem-vindo de volta"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {isSignUp
                ? "Comece a controlar suas finanças hoje"
                : "Entre para acessar seu painel"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">E-mail</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="voce@email.com"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-colors placeholder:text-muted-foreground/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Senha</label>
              <input
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-colors placeholder:text-muted-foreground/40"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-expense/8 border border-expense/15 px-4 py-3 text-sm text-expense font-medium">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl bg-income/8 border border-income/15 px-4 py-3 text-sm text-income font-medium">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-xl bg-brand py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm shadow-brand/30"
            >
              {loading ? "Carregando..." : isSignUp ? "Criar conta" : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp
                ? "Já tem conta? "
                : "Não tem conta? "}
              <span className="font-semibold text-brand">
                {isSignUp ? "Entrar" : "Cadastre-se"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
