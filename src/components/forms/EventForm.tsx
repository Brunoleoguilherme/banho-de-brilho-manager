"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventSchema, type EventInput } from "@/lib/validations";
import {
  createEventAction,
  updateEventAction,
  addResponsibilityItemAction,
  deleteResponsibilityItemAction,
} from "@/lib/actions/events";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { SERVICE_TYPES, BILLING_TYPES, BR_STATES } from "@/lib/constants";
import { FormSection } from "@/components/ui/FormSection";
import { Field, FormError, SubmitButton } from "@/components/forms/fields";
import type { Event } from "@/types";

export interface EventScheduleDefault {
  service_type: string;
  service_date: string | null;
  start_time: string | null;
  end_time: string | null;
}

/** Lista as datas entre início e fim (inclusive), limitado a 60 dias */
function dateRange(start: string, end: string): string[] {
  if (!start) return [];
  const dates: string[] = [];
  const d = new Date(start + "T12:00:00");
  const last = new Date((end || start) + "T12:00:00");
  let guard = 0;
  while (d <= last && guard < 60) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return dates;
}

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function dayLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return `${WEEKDAY_SHORT[d.getDay()]} ${iso.split("-").reverse().slice(0, 2).join("/")}`;
}

interface EventFormProps {
  event?: Event;
  schedules?: EventScheduleDefault[];
  clients: { id: string; name: string }[];
  defaultClientId?: string;
  responsibilityItems?: string[];
}

/** Itens que pedem quantidade ao serem adicionados */
const QTY_ITEMS = ["Locação de lixeiras", "Locação de caçambas"];

function partsOf(value: string): string[] {
  return value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Verifica se o item está no texto (aceita variação com quantidade entre parênteses) */
function hasItem(parts: string[], item: string): boolean {
  return parts.some((p) => p.toLowerCase().startsWith(item.toLowerCase()));
}

/** Junta os itens: só o primeiro começa com maiúscula, os demais em minúscula */
function joinParts(parts: string[]): string {
  return parts
    .map((p, i) =>
      i === 0
        ? p.charAt(0).toUpperCase() + p.slice(1)
        : p.charAt(0).toLowerCase() + p.slice(1)
    )
    .join(", ");
}

/** Lista de chips clicáveis que preenchem um texto separado por vírgulas */
function ChipPicker({
  items,
  value,
  otherValue,
  onChange,
}: {
  items: string[];
  value: string;
  /** Texto do outro campo — itens já usados lá não aparecem aqui */
  otherValue: string;
  onChange: (next: string) => void;
}) {
  const parts = partsOf(value);
  const otherParts = partsOf(otherValue);

  // Esconde itens que já foram atribuídos à outra parte
  const visible = items.filter((item) => !hasItem(otherParts, item));

  function toggle(item: string) {
    if (hasItem(parts, item)) {
      onChange(
        joinParts(
          parts.filter((p) => !p.toLowerCase().startsWith(item.toLowerCase()))
        )
      );
      return;
    }

    let label = item;
    if (QTY_ITEMS.some((q) => q.toLowerCase() === item.toLowerCase())) {
      const answer = prompt(`${item} — qual a quantidade?`, "1");
      if (answer === null) return;
      const qty = parseInt(answer.replace(/\D/g, ""), 10);
      if (qty > 0) label = `${item} (${qty} unidade${qty > 1 ? "s" : ""})`;
    }
    onChange(joinParts([...parts, label]));
  }

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {visible.map((item) => {
        const active = hasItem(parts, item);
        const activeLabel = active
          ? parts.find((p) => p.toLowerCase().startsWith(item.toLowerCase()))
          : null;
        return (
          <button
            key={item}
            type="button"
            onClick={() => toggle(item)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              active
                ? "border-brand-teal bg-teal-50 font-medium text-brand-petrol"
                : "border-gray-200 text-ink-muted hover:border-brand-teal/50 hover:text-brand-petrol"
            }`}
            title={active ? "Clique para remover" : "Clique para adicionar"}
          >
            {active ? "✓ " : "+ "}
            {activeLabel ?? item}
          </button>
        );
      })}
    </div>
  );
}

export function EventForm({
  event,
  schedules,
  clients,
  defaultClientId,
  responsibilityItems = [],
}: EventFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [itemBusy, setItemBusy] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  async function handleDeleteItem(label: string) {
    if (!confirm(`Excluir "${label}" da lista de responsabilidades?`)) return;
    setItemError(null);
    const result = await deleteResponsibilityItemAction(label);
    if (!result.ok) {
      setItemError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleAddItem() {
    if (!newItem.trim()) return;
    setItemBusy(true);
    setItemError(null);
    const result = await addResponsibilityItemAction(newItem);
    setItemBusy(false);
    if (!result.ok) {
      setItemError(result.error);
      return;
    }
    setNewItem("");
    router.refresh();
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: event
      ? {
          client_id: event.client_id,
          name: event.name,
          location_name: event.location_name ?? "",
          address: event.address ?? "",
          address_number: event.address_number ?? "",
          address_complement: event.address_complement ?? "",
          neighborhood: event.neighborhood ?? "",
          zip_code: event.zip_code ?? "",
          city: event.city ?? "",
          state: event.state ?? "",
          estimated_public: event.estimated_public ?? "",
          schedules: (() => {
            // Primeiro dia vira o período; os demais entram como dias avulsos
            // (preserva exatamente os dias salvos, mesmo não sequenciais)
            const byType: Record<
              string,
              {
                start_date: string;
                end_date: string;
                extra_dates: string[];
                days: Record<string, { start_time: string; end_time: string }>;
              }
            > = {};
            for (const s of schedules ?? []) {
              if (!s.service_date) continue;
              const entry = (byType[s.service_type] ??= {
                start_date: s.service_date,
                end_date: s.service_date,
                extra_dates: [],
                days: {},
              });
              if (s.service_date < entry.start_date) {
                entry.extra_dates.push(entry.start_date);
                entry.start_date = s.service_date;
                entry.end_date = s.service_date;
              } else if (s.service_date > entry.start_date) {
                entry.extra_dates.push(s.service_date);
              }
              entry.days[s.service_date] = {
                start_time: s.start_time?.slice(0, 5) ?? "",
                end_time: s.end_time?.slice(0, 5) ?? "",
              };
            }
            return byType;
          })(),
          service_type: event.service_type,
          billing_type: event.billing_type ?? "nota_fiscal",
          responsibilities_company: event.responsibilities_company ?? "",
          responsibilities_client: event.responsibilities_client ?? "",
          notes: event.notes ?? "",
        }
      : {
          client_id: defaultClientId ?? "",
          service_type: "limpeza_evento",
          billing_type: "nota_fiscal",
        },
  });

  const selectedTypes = (watch("service_type") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  // Permite registrar campos dinâmicos (schedules.<tipo>.<campo>)
  const reg = (name: string) => register(name as Parameters<typeof register>[0]);

  const typeLabel = (value: string) =>
    SERVICE_TYPES.find((t) => t.value === value)?.label ?? value;

  function toggleServiceType(value: string) {
    const next = selectedTypes.includes(value)
      ? selectedTypes.filter((v) => v !== value)
      : [...selectedTypes, value];
    setValue("service_type", next.join(","), { shouldValidate: true });
  }

  async function onSubmit(values: EventInput) {
    setLoading(true);
    setServerError(null);

    const result = event
      ? await updateEventAction(event.id, values)
      : await createEventAction(values);

    if (!result.ok) {
      setServerError(result.error);
      setLoading(false);
      return;
    }
    router.push("/eventos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormError message={serverError} />

      <FormSection
        title="Evento / Serviço"
        description="Briefing do serviço que será orçado"
      >
        <Field label="Cliente" required error={errors.client_id?.message}>
          <select className="input-base" {...register("client_id")}>
            <option value="">Selecione o cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nome do evento" required error={errors.name?.message}>
          <input
            className="input-base"
            placeholder="Ex.: Festival Árvore de Comunicação"
            {...register("name")}
          />
        </Field>
        <Field
          label="Tipos de serviço (marque todos que se aplicam)"
          required
          className="md:col-span-2"
          error={errors.service_type?.message}
        >
          <input type="hidden" {...register("service_type")} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SERVICE_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  selectedTypes.includes(t.value)
                    ? "border-brand-teal bg-teal-50 font-medium text-brand-petrol"
                    : "border-gray-200 text-ink-muted hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(t.value)}
                  onChange={() => toggleServiceType(t.value)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
                />
                {t.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Tipo de cobrança" error={errors.billing_type?.message}>
          <select className="input-base" {...register("billing_type")}>
            {BILLING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Público estimado" error={errors.estimated_public?.message}>
          <input
            type="number"
            min={0}
            className="input-base"
            placeholder="Ex.: 5000"
            {...register("estimated_public")}
          />
        </Field>
      </FormSection>

      <FormSection title="Local">
        <Field label="Nome do local" className="md:col-span-2" error={errors.location_name?.message}>
          <input
            className="input-base"
            placeholder="Ex.: Cine Brasil, Expominas, BeFly Hall"
            {...register("location_name")}
          />
        </Field>
        <Field label="Endereço (rua/avenida)" error={errors.address?.message}>
          <input
            className="input-base"
            placeholder="Ex.: Rua dos Inconfidentes"
            {...register("address")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Número" error={errors.address_number?.message}>
            <input className="input-base" placeholder="Ex.: 44" {...register("address_number")} />
          </Field>
          <Field label="Complemento" error={errors.address_complement?.message}>
            <input className="input-base" placeholder="Ex.: Portão 3" {...register("address_complement")} />
          </Field>
        </div>
        <Field label="Bairro" error={errors.neighborhood?.message}>
          <input className="input-base" placeholder="Ex.: Funcionários" {...register("neighborhood")} />
        </Field>
        <Field label="CEP" error={errors.zip_code?.message}>
          <input className="input-base" placeholder="00000-000" {...register("zip_code")} />
        </Field>
        <Field label="Cidade" error={errors.city?.message}>
          <input className="input-base" {...register("city")} />
        </Field>
        <Field label="UF (Estado)" error={errors.state?.message}>
          <select className="input-base" {...register("state")}>
            <option value="">Selecione</option>
            {BR_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </Field>
      </FormSection>

      {selectedTypes.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <div className="mb-5 border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-ink">Datas e horários</h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              Preencha o período de cada tipo de serviço marcado acima
            </p>
          </div>
          <div className="space-y-4">
            {selectedTypes.map((type) => {
              const sched = watch(`schedules.${type}` as never) as
                | {
                    start_date?: string;
                    end_date?: string;
                    extra_dates?: string[];
                    days?: Record<string, { start_time?: string; end_time?: string }>;
                  }
                | undefined;
              const extraDates = sched?.extra_dates ?? [];
              const validExtras = extraDates.filter((d) =>
                /^\d{4}-\d{2}-\d{2}$/.test(d)
              );
              const days = Array.from(
                new Set([
                  ...dateRange(sched?.start_date ?? "", sched?.end_date ?? ""),
                  ...validExtras,
                ])
              ).sort();

              function setExtras(next: string[]) {
                setValue(`schedules.${type}.extra_dates` as never, next as never);
              }

              function applySameTime() {
                const first = sched?.days?.[days[0]];
                if (!first?.start_time && !first?.end_time) return;
                for (const date of days) {
                  setValue(
                    `schedules.${type}.days.${date}` as never,
                    {
                      start_time: first.start_time ?? "",
                      end_time: first.end_time ?? "",
                    } as never
                  );
                }
              }

              return (
                <div key={type} className="rounded-lg border border-gray-100 p-4">
                  <p className="mb-3 text-sm font-semibold text-brand-petrol">
                    {typeLabel(type)}
                  </p>
                  <div className="grid grid-cols-2 gap-4 md:max-w-md">
                    <Field label="Data de início">
                      <input type="date" className="input-base" {...reg(`schedules.${type}.start_date`)} />
                    </Field>
                    <Field label="Data de término">
                      <input type="date" className="input-base" {...reg(`schedules.${type}.end_date`)} />
                    </Field>
                  </div>

                  {extraDates.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-ink-muted">
                        Dias avulsos (fora do período):
                      </p>
                      {extraDates.map((date, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="date"
                            className="input-base w-44"
                            value={date}
                            onChange={(e) => {
                              const next = [...extraDates];
                              next[i] = e.target.value;
                              setExtras(next);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setExtras(extraDates.filter((_, j) => j !== i))
                            }
                            className="rounded p-1.5 text-gray-400 hover:text-danger"
                            title="Remover este dia"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setExtras([...extraDates, ""])}
                    className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-petrol/5 px-3 py-2 text-xs font-semibold text-brand-petrol hover:bg-brand-petrol/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Incluir outro dia (não sequencial)
                  </button>

                  {days.length > 0 && (
                    <div className="mt-4 rounded-lg bg-surface p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                          Horários — {days.length} dia(s)
                        </p>
                        {days.length > 1 && (
                          <button
                            type="button"
                            onClick={applySameTime}
                            className="rounded-lg bg-brand-petrol/10 px-3 py-1.5 text-xs font-semibold text-brand-petrol hover:bg-brand-petrol/20"
                            title="Copia o horário do primeiro dia para todos os dias"
                          >
                            Horário igual para todos os dias
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {days.map((date) => (
                          <div key={date} className="flex flex-wrap items-center gap-3">
                            <span className="w-24 text-sm font-medium capitalize text-ink">
                              {dayLabel(date)}
                            </span>
                            <input
                              type="time"
                              className="input-base w-32"
                              {...reg(`schedules.${type}.days.${date}.start_time`)}
                            />
                            <span className="text-xs text-ink-muted">às</span>
                            <input
                              type="time"
                              className="input-base w-32"
                              {...reg(`schedules.${type}.days.${date}.end_time`)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <FormSection
        title="Responsabilidades"
        description="O que fica por conta de cada parte (vai para a proposta)"
      >
        <Field label="Responsabilidades da Banho de Brilho" className="md:col-span-2">
          <ChipPicker
            items={responsibilityItems}
            value={watch("responsibilities_company") ?? ""}
            otherValue={watch("responsibilities_client") ?? ""}
            onChange={(next) =>
              setValue("responsibilities_company", next, { shouldDirty: true })
            }
          />
          <textarea
            rows={3}
            className="input-base"
            placeholder="Clique nos itens acima ou digite livremente"
            {...register("responsibilities_company")}
          />
        </Field>
        <Field label="Responsabilidades do cliente / local" className="md:col-span-2">
          <ChipPicker
            items={responsibilityItems}
            value={watch("responsibilities_client") ?? ""}
            otherValue={watch("responsibilities_company") ?? ""}
            onChange={(next) =>
              setValue("responsibilities_client", next, { shouldDirty: true })
            }
          />
          <textarea
            rows={3}
            className="input-base"
            placeholder="Clique nos itens acima ou digite livremente"
            {...register("responsibilities_client")}
          />
        </Field>
        <div className="md:col-span-2 rounded-lg bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Faltou algum item? Inclua na lista
            </p>
            <button
              type="button"
              onClick={() => setShowDelete((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {showDelete ? "Fechar exclusão" : "Excluir item da lista"}
            </button>
          </div>
          {itemError && <p className="mb-2 text-xs text-danger">{itemError}</p>}

          {showDelete && (
            <div className="mb-3 rounded-lg border border-red-100 bg-red-50/50 p-3">
              <p className="mb-2 text-xs text-ink-muted">
                Clique no item que deseja apagar da lista (vale para todos os
                eventos daqui em diante):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {responsibilityItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleDeleteItem(item)}
                    className="flex items-center gap-1 rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs text-danger transition hover:bg-red-100"
                    title="Excluir este item da lista"
                  >
                    <Trash2 className="h-3 w-3" />
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              className="input-base"
              placeholder="Ex.: Gerador de energia"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddItem}
              disabled={itemBusy || !newItem.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {itemBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Incluir na lista
            </button>
          </div>
        </div>
        <Field label="Observações operacionais" className="md:col-span-2">
          <textarea rows={3} className="input-base" {...register("notes")} />
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/eventos")}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-gray-50"
        >
          Cancelar
        </button>
        <SubmitButton loading={loading}>
          {event ? "Salvar alterações" : "Cadastrar evento"}
        </SubmitButton>
      </div>
    </form>
  );
}
