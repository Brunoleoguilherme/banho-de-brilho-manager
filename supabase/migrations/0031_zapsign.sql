-- =====================================================================
-- Migration 0031: Integração ZapSign (assinatura digital de contratos)
-- Pode rodar mais de uma vez sem erro.
-- =====================================================================

alter table public.contracts add column if not exists zapsign_doc_token text;
alter table public.contracts add column if not exists zapsign_sign_url text;
alter table public.contracts add column if not exists zapsign_status text;

NOTIFY pgrst, 'reload schema';
