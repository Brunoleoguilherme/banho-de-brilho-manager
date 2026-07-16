-- 0035: Turno contínuo — permite a fase 'continuo' no cronograma da proposta e nos turnos da OS
alter table proposal_schedule_items drop constraint if exists proposal_schedule_items_phase_check;
alter table proposal_schedule_items add constraint proposal_schedule_items_phase_check
  check (phase = any (array['continuo','montagem','realizacao','desmontagem']::text[]));

alter table operation_shifts drop constraint if exists operation_shifts_phase_check;
alter table operation_shifts add constraint operation_shifts_phase_check
  check (phase = any (array['continuo','montagem','realizacao','desmontagem']::text[]));
