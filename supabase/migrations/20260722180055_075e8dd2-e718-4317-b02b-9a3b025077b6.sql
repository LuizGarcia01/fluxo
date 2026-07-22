CREATE TYPE public.expense_kind AS ENUM ('fixed', 'variable');
ALTER TABLE public.categories ADD COLUMN expense_kind public.expense_kind;