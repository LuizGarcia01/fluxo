
-- 1) Backfill unclassified expenses to 'variable' and make expense_kind required for expenses
UPDATE public.categories SET expense_kind = 'variable' WHERE type = 'expense' AND expense_kind IS NULL;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_expense_kind_required
  CHECK ((type = 'expense' AND expense_kind IS NOT NULL) OR (type = 'income' AND expense_kind IS NULL));

-- 2) Drop budgets (metas)
DROP TABLE IF EXISTS public.budgets;

-- 3) Investments
CREATE TYPE public.investment_type AS ENUM ('renda_fixa','acoes','fii','cripto','outros');

CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.investment_type NOT NULL DEFAULT 'outros',
  current_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own investments" ON public.investments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) Contributions (aportes/retiradas)
CREATE TABLE public.investment_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL, -- positive = aporte, negative = retirada
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_contributions TO authenticated;
GRANT ALL ON public.investment_contributions TO service_role;
ALTER TABLE public.investment_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own contributions" ON public.investment_contributions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_contrib_investment ON public.investment_contributions(investment_id);
CREATE INDEX idx_contrib_user_date ON public.investment_contributions(user_id, date);

-- 5) updated_at trigger for investments
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
