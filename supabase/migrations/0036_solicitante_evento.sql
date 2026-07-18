-- Solicitante do evento (A/c): quem pediu a proposta.
-- Varia por evento mesmo para o mesmo cliente (ex.: vários produtores da Unimed).
-- A proposta passa a herdar esses dados do evento (contato responsável no PDF).

alter table public.events
  add column if not exists requester_name text,
  add column if not exists requester_email text,
  add column if not exists requester_phone text;

comment on column public.events.requester_name is 'Solicitante do evento (A/c): quem pediu a proposta. Varia por evento mesmo para o mesmo cliente.';
comment on column public.events.requester_email is 'E-mail do solicitante do evento.';
comment on column public.events.requester_phone is 'Telefone do solicitante do evento.';
