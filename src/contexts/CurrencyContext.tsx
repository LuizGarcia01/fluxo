import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CurrencyCode = "EUR" | "BRL" | "USD" | "GBP";

export const CURRENCIES: Record<CurrencyCode, { label: string; symbol: string; locale: string }> = {
  EUR: { label: "Euro (€)", symbol: "€", locale: "pt-PT" },
  BRL: { label: "Real (R$)", symbol: "R$", locale: "pt-BR" },
  USD: { label: "Dólar ($)", symbol: "$", locale: "en-US" },
  GBP: { label: "Libra (£)", symbol: "£", locale: "en-GB" },
};

interface CurrencyContextValue {
  currency: CurrencyCode;
  symbol: string;
  setCurrency: (c: CurrencyCode) => void;
  fmt: (v: number) => string;
  fmtShort: (v: number) => string;
}

const defaultFmt = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "EUR",
  symbol: "€",
  setCurrency: () => {},
  fmt: defaultFmt,
  fmtShort: defaultFmt,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const stored = localStorage.getItem("nexo-currency");
    return (stored && stored in CURRENCIES ? stored : "EUR") as CurrencyCode;
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("user_settings")
        .select("currency")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          const c = data?.currency as CurrencyCode | null;
          if (c && c in CURRENCIES) {
            setCurrencyState(c);
            localStorage.setItem("nexo-currency", c);
          }
        });
    });
  }, []);

  function setCurrency(c: CurrencyCode) {
    setCurrencyState(c);
    localStorage.setItem("nexo-currency", c);
  }

  const cfg = CURRENCIES[currency];

  const fmt = (v: number) =>
    new Intl.NumberFormat(cfg.locale, { style: "currency", currency }).format(v);

  const fmtShort = (v: number) =>
    new Intl.NumberFormat(cfg.locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <CurrencyContext.Provider value={{ currency, symbol: cfg.symbol, setCurrency, fmt, fmtShort }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
