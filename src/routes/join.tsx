import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Users, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getInviteInfo, acceptHouseholdInvite } from "@/lib/budget.functions";
import { UserAvatar } from "@/components/dashboard/UserAvatar";

export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: JoinPage,
});

function JoinPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<"loading" | "invite" | "accepting" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerColor, setOwnerColor] = useState("#6ec6ba");
  const [ownerInitials, setOwnerInitials] = useState("??");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!token) { setErrorMsg("Token inválido."); setPhase("error"); return; }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      try {
        const info = await getInviteInfo({ data: { token } });
        if (!info) throw new Error("Convite inválido ou expirado.");
        setOwnerName(info.ownerName);
        setOwnerColor(info.ownerColor);
        setOwnerInitials(
          info.ownerName
            .split(/\s+/)
            .slice(0, 2)
            .map((w: string) => w[0]?.toUpperCase() ?? "")
            .join("")
        );
        setPhase("invite");
      } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : "Convite inválido ou expirado.");
        setPhase("error");
      }
    })();
  }, [token]);

  async function handleAccept() {
    if (!isLoggedIn) {
      localStorage.setItem("nexo-pending-invite", token);
      navigate({ to: "/auth" });
      return;
    }
    setPhase("accepting");
    try {
      await acceptHouseholdInvite({ data: { token } });
      // Force session refresh so the new delegated_to is in the access token
      // Without this, the old cached JWT would be used and delegation would fail
      await supabase.auth.refreshSession();
      setPhase("done");
      setTimeout(() => navigate({ to: "/" }), 2000);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao aceitar convite.");
      setPhase("error");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="size-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto">
          <Users className="size-7 text-brand" />
        </div>

        {phase === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">A verificar convite…</p>
          </div>
        )}

        {phase === "invite" && (
          <>
            <div>
              <h1 className="text-xl font-bold mb-1">Convite de partilha</h1>
              <p className="text-sm text-muted-foreground">Foste convidado/a para aceder à conta de:</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <UserAvatar initials={ownerInitials} color={ownerColor} size="md" />
              <p className="text-base font-semibold">{ownerName}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoggedIn
                ? "Ao aceitar, passas a ver e editar os dados desta conta."
                : "Precisas de criar uma conta ou iniciar sessão para aceitar."}
            </p>
            <button
              onClick={handleAccept}
              className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
            >
              {isLoggedIn ? "Aceitar convite" : "Entrar para aceitar"}
            </button>
          </>
        )}

        {phase === "accepting" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-brand" />
            <p className="text-sm text-muted-foreground">A aceitar convite…</p>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center gap-3">
            <div className="size-12 rounded-full bg-income/10 flex items-center justify-center">
              <Check className="size-6 text-income" />
            </div>
            <p className="text-base font-bold">Convite aceite!</p>
            <p className="text-sm text-muted-foreground">A redirecionar…</p>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center gap-3">
            <div className="size-12 rounded-full bg-expense/10 flex items-center justify-center">
              <X className="size-6 text-expense" />
            </div>
            <p className="text-base font-bold">Erro</p>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <button onClick={() => navigate({ to: "/" })} className="text-sm text-brand font-semibold">
              Ir para o início →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
