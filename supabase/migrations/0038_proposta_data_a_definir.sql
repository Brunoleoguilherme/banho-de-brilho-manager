-- 0038: Cronograma da proposta — marca de "data a definir".
-- Quando true, a linha do cronograma não tem data definida ainda e a proposta
-- exibe "A definir" em vez de "—" (diferente de linha sem data por esquecimento).
alter table public.proposal_schedule_items
  add column if not exists date_tbd boolean not null default false;

comment on column public.proposal_schedule_items.date_tbd is
  'Modo manual: quando true, a data está "a definir" e deve ser exibida como "A definir" na proposta. service_date fica nulo.';
