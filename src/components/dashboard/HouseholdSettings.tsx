import { useState } from "react";
import { Users, Link2, Copy, Check, LogOut, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "./UserAvatar";
import type { HouseholdInfo } from "@/lib/budget.types";
import {
  createHouseholdInvite,
  removeHouseholdAccess,
} from "@/lib/budget.functions";

interface Props {
  info: HouseholdInfo;
  onRefresh: () => void;
}

export function HouseholdSettings({ info, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(info.pendingInvite?.token ?? null);

  const inviteUrl = inviteToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join?token=${inviteToken}`
    : null;

  async function handleGenerateInvite() {
    setLoading(true);
    try {
      const { token } = await createHouseholdInvite({ data: undefined });
      setInviteToken(token);
    } catch (e) {
      toast.error("Erro ao gerar convite");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRemove() {
    const label = info.status === "owner"
      ? `Remover acesso de ${info.partner?.displayName}?`
      : `Deixar de partilhar com ${info.partner?.displayName}?`;
    if (!confirm(label)) return;
    setLoading(true);
    try {
      await removeHouseholdAccess({ data: undefined });
      toast.success("Acesso removido. Recarrega a página.");
      onRefresh();
    } catch {
      toast.error("Erro ao remover acesso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Users className="size-4 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Partilha</p>
      </div>

      {/* Has partner */}
      {info.partner && (
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <UserAvatar initials={info.partner.initials} color={info.partner.color} size="md" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{info.partner.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {info.status === "member" ? "Estás a aceder à conta desta pessoa" : "Tem acesso conjunto"}
              </p>
            </div>
            <button
              onClick={handleRemove}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-expense/30 text-expense text-xs font-semibold hover:bg-expense/8 transition-colors disabled:opacity-50"
            >
              {info.status === "member"
                ? <><LogOut className="size-3" /> Sair</>
                : <><UserMinus className="size-3" /> Remover</>}
            </button>
          </div>
        </div>
      )}

      {/* No partner — invite section */}
      {!info.partner && (
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Convida o teu parceiro/a para gerir as finanças juntos. Partilham os mesmos dados em tempo real.
          </p>

          {inviteUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    copied ? "bg-income/10 text-income border border-income/20" : "bg-brand text-white hover:opacity-90"
                  }`}
                >
                  {copied ? <><Check className="size-3.5" /> Copiado</> : <><Copy className="size-3.5" /> Copiar</>}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Link válido 7 dias · uso único ·{" "}
                <button onClick={handleGenerateInvite} className="text-brand underline-offset-2 hover:underline">
                  gerar novo
                </button>
              </p>
            </div>
          ) : (
            <button
              onClick={handleGenerateInvite}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              <Link2 className="size-4" />
              {loading ? "A gerar..." : "Gerar link de convite"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
