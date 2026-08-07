import { createFileRoute } from "@tanstack/react-router";
import { NexoMark } from "@/components/dashboard/NexoLogo";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/trial-expired")({
  ssr: false,
  component: TrialExpiredPage,
});

function TrialExpiredPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <NexoMark size={48} />

        <div className="size-16 rounded-2xl bg-expense/10 flex items-center justify-center mx-auto">
          <Clock className="size-8 text-expense" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">Período de teste terminado</h1>
          <p className="text-sm text-muted-foreground">
            O teu acesso à versão de demonstração expirou.
            Contacta o administrador para continuar a usar o Nexo.
          </p>
        </div>

        <a
          href="mailto:silvaluizgarcia7@gmail.com"
          className="inline-flex items-center justify-center w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          Pedir acesso
        </a>
      </div>
    </div>
  );
}
