create type public.transaction_type as enum ('income', 'expense');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type public.transaction_type not null,
  color text,
  created_at timestamptz default now() not null
);

grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;

alter table public.categories enable row level security;

create policy "Users can manage own categories"
  on public.categories
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type public.transaction_type not null,
  category_id uuid references public.categories(id) on delete set null,
  amount decimal(12,2) not null,
  description text not null,
  date date not null,
  created_at timestamptz default now() not null
);

grant select, insert, update, delete on public.transactions to authenticated;
grant all on public.transactions to service_role;

alter table public.transactions enable row level security;

create policy "Users can manage own transactions"
  on public.transactions
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  amount decimal(12,2) not null,
  created_at timestamptz default now() not null
);

grant select, insert, update, delete on public.budgets to authenticated;
grant all on public.budgets to service_role;

alter table public.budgets enable row level security;

create policy "Users can manage own budgets"
  on public.budgets
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());