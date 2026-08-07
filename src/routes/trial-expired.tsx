import { createFileRoute, useRouter } from "@tanstack/react-router";
import { NexoMark } from "@/components/dashboard/NexoLogo";
import { Clock, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/trial-expired")({
  ssr: false,
  component: TrialExpiredPage,
});

function TrialExpiredPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background relative overflow-hidden">

      {/* Teal glow background */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(110,198,186,0.13) 0%, transparent 70%)", transform: "translate(-50%, -40%)" }}
      />

      <div className="relative z-10 w-full max-w-[340px] flex flex-col items-center text-center gap-8">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <NexoMark size={68} />
          <div>
            <div
              className="text-foreground leading-none"
              style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em" }}
            >
              nexo
            </div>
            <div className="text-[12px] text-muted-foreground mt-1.5 tracking-[0.08em] uppercase">
              Orçamento pessoal
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-10 h-px bg-border" />

        {/* Status block */}
        <div className="flex flex-col items-center gap-5">
          <div
            className="size-[72px] rounded-[22px] flex items-center justify-center"
            style={{
              background: "rgba(248,113,113,0.09)",
              border: "1.5px solid rgba(248,113,113,0.22)",
            }}
          >
            <Clock className="size-8" style={{ color: "#f87171" }} />
          </div>

          <div className="space-y-2.5">
            <h1
              className="text-foreground leading-tight"
              style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}
            >
              Período de teste encerrado
            </h1>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              O teu acesso à versão de demonstração expirou.
              Fala com o administrador para continuares a usar o Nexo.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="w-full space-y-3">
          <a
            href="mailto:silvaluizgarcia7@gmail.com"
            className="block w-full py-[14px] rounded-2xl text-[15px] font-bold text-white text-center transition-opacity hover:opacity-90 active:opacity-80"
            style={{
              background: "linear-gradient(135deg, #52b8ac 0%, #6ec6ba 100%)",
              boxShadow: "0 8px 28px -4px rgba(110,198,186,0.45)",
            }}
          >
            Pedir acesso
          </a>
          <button
            onClick={() => router.navigate({ to: "/" })}
            className="w-full py-3 rounded-2xl text-[14px] font-semibold text-muted-foreground border border-border bg-card hover:bg-surface transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="size-3.5" />
            Já tenho acesso — entrar
          </button>
        </div>

        {/* Footer */}
        <p className="text-[11px]" style={{ color: "var(--color-muted-foreground)", opacity: 0.5 }}>
          nexo · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
