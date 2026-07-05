-- =====================================================================
-- Migration 0029: Assinatura do cliente no histórico de contratos
-- signed_by = assinatura da Banho de Brilho (certificado digital);
-- client_signed_by = assinatura do cliente (quando houver).
-- Pode rodar mais de uma vez sem erro.
-- =====================================================================

alter table public.historical_contracts add column if not exists client_signed_by text;

NOTIFY pgrst, 'reload schema';
