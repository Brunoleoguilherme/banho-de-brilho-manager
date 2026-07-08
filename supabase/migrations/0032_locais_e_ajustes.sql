-- 0032_locais_e_ajustes.sql
-- Ajustes nas PROPOSTAS (numeracao BBP + precisao da margem) e novo cadastro
-- de LOCAIS DE EVENTO (com banheiros e descartaveis), a pedido do Claudio.

-- 1) Numeracao BBP: continuar do MAIOR numero ja existente no sistema,
--    considerando as propostas geradas aqui E o historico importado (OneDrive).
drop function if exists next_proposal_number(integer);
create function next_proposal_number(p_year integer)
returns integer
language sql
as $$
  select coalesce(max(n), 0) + 1
  from (
    select number as n
      from proposals
      where year = p_year and number is not null
    union all
    select (regexp_match(code, '^BBP0*([0-9]+)'))[1]::int as n
      from historical_proposals
      where year = p_year and code ~ '^BBP[0-9]'
  ) t;
$$;

-- 2) Margem com 4 casas decimais (ex.: 100,1234); aceita negativa para
--    analise de contraproposta abaixo do custo.
alter table proposals
  alter column margin_percent type numeric(9,4) using margin_percent::numeric;

-- 3) Cadastro de Locais de evento (espelho da planilha "LOCAL DE EVENTO")
create table if not exists event_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Endereco
  address text,
  address_number text,
  address_complement text,
  neighborhood text,
  city text,
  state text,
  zip_code text,
  -- Contato
  contact_name text,
  contact_phone text,
  contact_email text,
  -- Tipos de descartavel + suporte
  soap_type text,          -- Sabonete liquido (Refil caixa / Recipiente)
  paper_towel_type text,   -- Papel toalha (Bobina / Interfolhado)
  toilet_paper_type text,  -- Papel higienico (Rolao 300m / Interfolhado / Rolinho)
  trash_bag text,          -- Saco de lixo (litragem)
  -- Banheiros: quantidade de suportes por tipo em cada WC
  -- CB = cabines | PH = papel higienico | PT = papel toalha | SB = sabonete
  fem_cb int not null default 0,
  fem_ph int not null default 0,
  fem_pt int not null default 0,
  fem_sb int not null default 0,
  masc_cb int not null default 0,
  masc_ph int not null default 0,
  masc_pt int not null default 0,
  masc_sb int not null default 0,
  pne_cb int not null default 0,
  pne_ph int not null default 0,
  pne_pt int not null default 0,
  pne_sb int not null default 0,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) Liga o evento ao local salvo (opcional)
alter table events
  add column if not exists location_id uuid references event_locations(id);

-- 5) RLS: qualquer usuario autenticado (mesmo padrao permissivo do app)
alter table event_locations enable row level security;
drop policy if exists "event_locations_all" on event_locations;
create policy "event_locations_all" on event_locations
  for all to authenticated using (true) with check (true);
