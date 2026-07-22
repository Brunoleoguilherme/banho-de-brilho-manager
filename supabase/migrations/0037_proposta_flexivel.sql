-- 0037: Proposta flexível — modo manual com carga horária (jornada), itens de
-- locação e valores discriminados digitados direto (sem passar pela margem).
-- Aditivo: propostas em modo 'automatico' (padrão) seguem exatamente como antes.

-- Modo de precificação da proposta: 'automatico' (motor de margem) | 'manual'
alter table public.proposals
  add column if not exists pricing_mode text not null default 'automatico';
alter table public.proposals drop constraint if exists proposals_pricing_mode_check;
alter table public.proposals add constraint proposals_pricing_mode_check
  check (pricing_mode = any (array['automatico','manual']::text[]));

-- Quadro de funcionários: data opcional + texto livre de horário/carga horária
alter table public.proposal_schedule_items
  alter column service_date drop not null;
alter table public.proposal_schedule_items
  add column if not exists time_label text;

comment on column public.proposal_schedule_items.time_label is
  'Modo manual: texto livre do horário/carga horária (ex.: "Carga horária de 08 horas"). Quando preenchido, tem prioridade sobre start_time/end_time na exibição.';

-- Itens de locação/equipamentos (modo manual): descrição, quantidade e valor
create table if not exists public.proposal_rental_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_value numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists proposal_rental_items_proposal_id_idx
  on public.proposal_rental_items(proposal_id);

-- Valores discriminados (modo manual): rótulo + valor que somam no total
create table if not exists public.proposal_value_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  label text not null,
  amount numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists proposal_value_items_proposal_id_idx
  on public.proposal_value_items(proposal_id);

-- RLS: mesmo padrão das demais tabelas de proposta
alter table public.proposal_rental_items enable row level security;
alter table public.proposal_value_items enable row level security;

drop policy if exists proposal_rental_items_select on public.proposal_rental_items;
create policy proposal_rental_items_select on public.proposal_rental_items
  for select using (is_active_user());
drop policy if exists proposal_rental_items_write on public.proposal_rental_items;
create policy proposal_rental_items_write on public.proposal_rental_items
  for all using (current_user_role() = any (array['admin','gestor','comercial']))
  with check (current_user_role() = any (array['admin','gestor','comercial']));

drop policy if exists proposal_value_items_select on public.proposal_value_items;
create policy proposal_value_items_select on public.proposal_value_items
  for select using (is_active_user());
drop policy if exists proposal_value_items_write on public.proposal_value_items;
create policy proposal_value_items_write on public.proposal_value_items
  for all using (current_user_role() = any (array['admin','gestor','comercial']))
  with check (current_user_role() = any (array['admin','gestor','comercial']));

grant select, insert, update, delete on public.proposal_rental_items to anon, authenticated, service_role;
grant select, insert, update, delete on public.proposal_value_items to anon, authenticated, service_role;
