-- =====================================================================
-- Migration 0030: Chave PIX do funcionário (para pagamento de diárias)
-- Pode rodar mais de uma vez sem erro.
-- =====================================================================

alter table public.employees add column if not exists pix_key text;

NOTIFY pgrst, 'reload schema';
