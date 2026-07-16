-- 0034: Responsável legal do cliente (assina o contrato) + data de vencimento do pagamento
-- Idempotente: pode rodar no SQL Editor sem quebrar se já existir.

alter table clients add column if not exists legal_rep_name text;
alter table clients add column if not exists legal_rep_cpf  text;
alter table clients add column if not exists legal_rep_role text;

alter table proposals add column if not exists payment_due_date date;
