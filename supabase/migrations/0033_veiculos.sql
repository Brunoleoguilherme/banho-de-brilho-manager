-- 0033_veiculos.sql
-- Pre-cadastro de veiculos (frota) para escolher na OS + cor do veiculo.

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  model text not null,   -- modelo / descricao (ex.: Fiat Doblo Adventure)
  color text,            -- cor (ex.: Branco)
  plate text,            -- placa (ex.: HKZ 1368)
  notes text,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cor do veiculo na OS + vinculo opcional ao cadastro
alter table os_vehicles add column if not exists color text;
alter table os_vehicles add column if not exists vehicle_id uuid references vehicles(id);

alter table vehicles enable row level security;
drop policy if exists "vehicles_all" on vehicles;
create policy "vehicles_all" on vehicles
  for all to authenticated using (true) with check (true);
