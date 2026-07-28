import { useState, useEffect } from "react";
import { Bell, BellOff, MessageCircle, Phone, Check, Loader2, Coins, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToPush, unsubscribeFromPush, getPushStatus } from "@/lib/push";
import { toast } from "sonner";
import { CURRENCIES, type CurrencyCode, useCurrency } from "@/contexts/CurrencyContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface Settings {
  phone: string;
  notify_push: boolean;
  notify_whatsapp: boolean;
  notify_days_before: number;
  currency: CurrencyCode;
}

const DEFAULT: Settings = {
  phone: "",
  notify_push: false,
  notify_whatsapp: false,
  notify_days_before: 1,
  currency: "EUR",
};

export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [pushStatus, setPushStatus] = useState<"granted" | "denied" | "default" | "unsupported">("default");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { setCurrency } = useCurrency();
  const { canInstall, isInstalled, install } = usePWAInstall();

  useEffect(() => {
    loadSettings();
    getPushStatus().then(setPushStatus);
  }, []);

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setSettings({
        phone: data.phone ?? "",
        notify_push: data.notify_push ?? false,
        notify_whatsapp: data.notify_whatsapp ?? false,
        notify_days_before: data.notify_days_before ?? 1,
        currency: (data.currency as CurrencyCode) ?? "EUR",
      });
    }
    setLoading(false);
  }

  async function handleTogglePush(enabled: boolean) {
    if (enabled) {
      const ok = await subscribeToPush();
      if (!ok) {
        toast.error("Não foi possível ativar notificações. Verifica as permissões do browser.");
        return;
      }
      setPushStatus("granted");
    } else {
      await unsubscribeFromPush();
    }
    setSettings((s) => ({ ...s, notify_push: enabled }));
  }

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        phone: settings.phone || null,
        notify_push: settings.notify_push,
        notify_whatsapp: settings.notify_whatsapp,
        notify_days_before: settings.notify_days_before,
        currency: settings.currency,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    setSaving(false);
    if (error) {
      toast.error("Erro ao guardar configurações");
    } else {
      setCurrency(settings.currency);
      toast.success("Configurações guardadas");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-0.5">Notificações</h3>
        <p className="text-xs text-muted-foreground">Recebe alertas quando uma conta está prestes a vencer</p>
      </div>

      {/* Dias antes */}
      <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Quando alertar</p>
        <div className="flex gap-2">
          {[1, 2, 3].map((d) => (
            <button
              key={d}
              onClick={() => setSettings((s) => ({ ...s, notify_days_before: d }))}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                settings.notify_days_before === d
                  ? "bg-brand text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {d} dia{d > 1 ? "s" : ""} antes
            </button>
          ))}
        </div>
      </div>

      {/* Push */}
      <div className="bg-surface rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-9 rounded-xl flex items-center justify-center ${settings.notify_push ? "bg-brand/10" : "bg-muted/40"}`}>
              {settings.notify_push
                ? <Bell className="size-4 text-brand" />
                : <BellOff className="size-4 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-semibold">Notificação Push</p>
              <p className="text-xs text-muted-foreground">
                {pushStatus === "denied"
                  ? "Bloqueado pelo browser — ativa nas definições"
                  : pushStatus === "unsupported"
                  ? "Não suportado neste browser"
                  : "Aparece no telemóvel e computador"}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleTogglePush(!settings.notify_push)}
            disabled={pushStatus === "denied" || pushStatus === "unsupported"}
            className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-40 ${
              settings.notify_push ? "bg-brand" : "bg-border"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 size-5 bg-white rounded-full shadow transition-transform ${
              settings.notify_push ? "translate-x-5" : "translate-x-0"
            }`} />
          </button>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-9 rounded-xl flex items-center justify-center ${settings.notify_whatsapp ? "bg-[#25D366]/10" : "bg-muted/40"}`}>
              <MessageCircle className={`size-4 ${settings.notify_whatsapp ? "text-[#25D366]" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-sm font-semibold">WhatsApp</p>
              <p className="text-xs text-muted-foreground">Mensagem no teu WhatsApp pessoal</p>
            </div>
          </div>
          <button
            onClick={() => setSettings((s) => ({ ...s, notify_whatsapp: !s.notify_whatsapp }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.notify_whatsapp ? "bg-[#25D366]" : "bg-border"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 size-5 bg-white rounded-full shadow transition-transform ${
              settings.notify_whatsapp ? "translate-x-5" : "translate-x-0"
            }`} />
          </button>
        </div>

        {settings.notify_whatsapp && (
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3" /> Número de telemóvel
            </label>
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => setSettings((s) => ({ ...s, phone: e.target.value }))}
              placeholder="+351 912 345 678"
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-colors"
            />
            <p className="text-[11px] text-muted-foreground">Inclui o código do país (ex: +351 para Portugal)</p>
          </div>
        )}
      </div>

      {/* Moeda */}
      <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Coins className="size-4 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Moeda</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(CURRENCIES) as [CurrencyCode, typeof CURRENCIES[CurrencyCode]][]).map(([code, cfg]) => (
            <button
              key={code}
              onClick={() => setSettings((s) => ({ ...s, currency: code }))}
              className={`rounded-xl py-2.5 px-3 text-sm font-semibold transition-colors text-left ${
                settings.currency === code
                  ? "bg-brand text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-base mr-1.5">{cfg.symbol}</span>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Instalar app */}
      {(canInstall || isInstalled) && (
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`size-9 rounded-xl flex items-center justify-center ${isInstalled ? "bg-brand/10" : "bg-muted/40"}`}>
                <Smartphone className={`size-4 ${isInstalled ? "text-brand" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold">Instalar Aplicação</p>
                <p className="text-xs text-muted-foreground">
                  {isInstalled ? "Já instalada no ecrã inicial" : "Adiciona ao ecrã inicial do telemóvel"}
                </p>
              </div>
            </div>
            {!isInstalled && (
              <button
                onClick={install}
                className="rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Instalar
              </button>
            )}
            {isInstalled && <Check className="size-4 text-brand" />}
          </div>
        </div>
      )}

      {/* Guardar */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        {saving ? "A guardar..." : "Guardar configurações"}
      </button>
    </div>
  );
}
