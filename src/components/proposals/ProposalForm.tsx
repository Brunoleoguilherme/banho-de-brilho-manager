"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Undo2 } from "lucide-react";
import {
  proposalSchema,
  type ProposalInput,
  PRICING_CATEGORIES,
} from "@/lib/validations/proposal";
import {
  createProposalAction,
  updateProposalAction,
} from "@/lib/actions/proposals";
import { calculatePricing, itemTotal, SEM_HORAS } from "@/lib/money/pricing";
import { valorPorExtenso } from "@/lib/money/extenso";
import { formatMoney } from "@/lib/utils";
import { FormSection } from "@/components/ui/FormSection";
import { Field, FormError, SubmitButton } from "@/components/forms/fields";
import { DisposablesCalculator } from "@/components/proposals/DisposablesCalculator";

const PHASES = [
  { value: "montagem", label: "Montagem" },
  { value: "realizacao", label: "Realização" },
  { value: "desmontagem", label: "Desmontagem" },
] as const;

interface EventScheduleOption {
  service_type: string;
  service_date: string;
  start_time: string | null;
  end_time: string | null;
}

/** Converte o tipo de serviço do evento na fase do cronograma da proposta */
function phaseFor(serviceType: string): "montagem" | "realizacao" | "desmontagem" {
  if (serviceType === "limpeza_montagem") return "montagem";
  if (serviceType === "limpeza_desmontagem") return "desmontagem";
  return "realizacao";
}

const PHASE_ORDER = { montagem: 0, realizacao: 1, desmontagem: 2 } as const;

interface ProposalFormProps {
  events: {
    id: string;
    name: string;
    client_name: string;
    start_date: string | null;
    estimated_public?: number | null;
    schedules?: EventScheduleOption[];
  }[];
  proposalId?: string;
  defaultValues?: Partial<ProposalInput>;
  defaultEventId?: string;
  /** Percentuais do Custo do Evento (Financeiro) p/ lucro real estimado */
  costPercents?: { custoFixo: number; encargos: number; diversos: number };
}

export function ProposalForm({
  events,
  proposalId,
  defaultValues,
  defaultEventId,
  costPercents,
}: ProposalFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProposalInput>({
    resolver: zodResolver(proposalSchema),
    defaultValues: defaultValues ?? {
      event_id: defaultEventId ?? "",
      issue_date: new Date().toISOString().slice(0, 10),
      emission_type: "nota_fiscal",
      payment_terms: "Contra entrega de Nota Fiscal",
      margin_percent: 0,
      bv_percent: 0,
      discount_percent: 0,
      tax_percent_nf: 0,
      tax_percent_receipt: 0,
      schedule: [
        {
          phase: "realizacao",
          service_date: "",
          start_time: "",
          end_time: "",
          cleaning_agents: 1,
          coordinators: 0,
          notes: "",
        },
      ],
      items: [
        {
          category: "Agente de limpeza",
          description: "Agente de limpeza (diária)",
          quantity: 1,
          hours: "",
          unit_price: 0,
          is_internal_cost: true,
          show_on_proposal: true,
          notes: "",
        },
        {
          category: "Coordenador",
          description: "Coordenador (diária)",
          quantity: 0,
          hours: "",
          unit_price: 0,
          is_internal_cost: true,
          show_on_proposal: true,
          notes: "",
        },
        {
          category: "Vale-refeição",
          description: "Vale-refeição",
          quantity: 1,
          hours: "",
          unit_price: 0,
          is_internal_cost: true,
          show_on_proposal: false,
          notes: "",
        },
        {
          category: "Vale-transporte",
          description: "Vale-transporte",
          quantity: 1,
          hours: "",
          unit_price: 0,
          is_internal_cost: true,
          show_on_proposal: false,
          notes: "",
        },
      ],
    },
  });

  const scheduleArray = useFieldArray({ control, name: "schedule" });
  const itemsArray = useFieldArray({ control, name: "items" });

  // Ao trocar o evento, puxa as datas e horários cadastrados nele
  const watchedEventId = watch("event_id");
  const [lastEventId, setLastEventId] = useState(defaultValues?.event_id ?? "");
  useEffect(() => {
    if (!watchedEventId || watchedEventId === lastEventId) return;
    setLastEventId(watchedEventId);

    const eventSchedules =
      events.find((e) => e.id === watchedEventId)?.schedules ?? [];
    if (eventSchedules.length === 0) return;

    const rows = [...eventSchedules]
      .sort((a, b) =>
        a.service_date === b.service_date
          ? PHASE_ORDER[phaseFor(a.service_type)] -
            PHASE_ORDER[phaseFor(b.service_type)]
          : a.service_date < b.service_date
            ? -1
            : 1
      )
      .map((s) => ({
        phase: phaseFor(s.service_type),
        service_date: s.service_date,
        start_time: s.start_time?.slice(0, 5) ?? "",
        end_time: s.end_time?.slice(0, 5) ?? "",
        cleaning_agents: 1,
        coordinators: 0,
        notes: "",
      }));
    scheduleArray.replace(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedEventId]);

  // Ao trocar Nota Fiscal ↔ Recibo, ajusta o texto padrão da forma de pagamento
  const watchedEmission = watch("emission_type");
  useEffect(() => {
    const current = (watch("payment_terms") ?? "").trim();
    const padrao = /^contra entrega de (nota fiscal|recibo)$/i;
    if (current === "" || padrao.test(current)) {
      setValue(
        "payment_terms",
        watchedEmission === "recibo"
          ? "Contra entrega de Recibo"
          : "Contra entrega de Nota Fiscal"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedEmission]);

  const values = watch();
  const pricing = calculatePricing(
    (values.items ?? []).map((i) => ({
      quantity: Number(i.quantity) || 0,
      hours: i.hours === "" || i.hours === undefined ? null : Number(i.hours),
      unit_price: Number(i.unit_price) || 0,
      is_internal_cost: !!i.is_internal_cost,
      category: i.category,
    })),
    {
      margin_percent: Number(values.margin_percent) || 0,
      bv_percent: Number(values.bv_percent) || 0,
      discount_percent: Number(values.discount_percent) || 0,
      tax_percent_nf: Number(values.tax_percent_nf) || 0,
      tax_percent_receipt: Number(values.tax_percent_receipt) || 0,
    }
  );
  const finalTotal =
    values.emission_type === "recibo" ? pricing.totalReceipt : pricing.totalNf;
  const totalAgents = (values.schedule ?? []).reduce(
    (acc, s) => acc + (Number(s.cleaning_agents) || 0),
    0
  );
  const totalCoordinators = (values.schedule ?? []).reduce(
    (acc, s) => acc + (Number(s.coordinators) || 0),
    0
  );

  // Quantidades preenchidas automaticamente a partir do cronograma:
  // Agente = soma de AL · Coordenador = soma de CO · VR e VT = AL + CO
  const autoQtyFor = (category: string): number | null => {
    if (category === "Agente de limpeza") return totalAgents;
    if (category === "Coordenador") return totalCoordinators;
    if (category === "Vale-refeição" || category === "Vale-transporte")
      return totalAgents + totalCoordinators;
    return null;
  };

  const itemCategories = (values.items ?? []).map((i) => i.category).join("|");
  useEffect(() => {
    (values.items ?? []).forEach((item, index) => {
      const target = autoQtyFor(item.category);
      if (target !== null && Number(item.quantity) !== target) {
        setValue(`items.${index}.quantity`, target);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAgents, totalCoordinators, itemCategories]);

  async function onSubmit(data: ProposalInput) {
    setLoading(true);
    setServerError(null);

    const result = proposalId
      ? await updateProposalAction(proposalId, data)
      : await createProposalAction(data);

    if (!result.ok) {
      setServerError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/propostas/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormError message={serverError} />

      <FormSection
        title="Evento e contato"
        description="Para quem esta proposta será enviada"
      >
        <Field label="Evento" required error={errors.event_id?.message}>
          <select className="input-base" {...register("event_id")}>
            <option value="">Selecione o evento</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.client_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contato responsável (A/c)" error={errors.contact_name?.message}>
          <input className="input-base" placeholder="Ex.: Kellen Cristina Santiago" {...register("contact_name")} />
        </Field>
        <Field label="E-mail do contato" error={errors.contact_email?.message}>
          <input type="email" className="input-base" {...register("contact_email")} />
        </Field>
        <Field label="Telefone do contato" error={errors.contact_phone?.message}>
          <input className="input-base" {...register("contact_phone")} />
        </Field>
        <Field label="Data de emissão" required error={errors.issue_date?.message}>
          <input type="date" className="input-base" {...register("issue_date")} />
        </Field>
        <Field label="Validade da proposta" error={errors.valid_until?.message}>
          <input type="date" className="input-base" {...register("valid_until")} />
        </Field>
      </FormSection>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
        <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Cronograma de funcionários
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              AL = Agente de Limpeza · CO = Coordenador
            </p>
          </div>
        </div>

        {scheduleArray.fields.length === 0 && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-warning">
            Selecione um evento que já tenha datas e horários cadastrados — o
            cronograma é preenchido automaticamente a partir do evento.
          </p>
        )}

        {errors.schedule?.message && (
          <p className="mb-3 text-xs text-danger">{errors.schedule.message}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="pb-2 pr-2">Fase</th>
                <th className="pb-2 pr-2">Data</th>
                <th className="pb-2 pr-2">Início</th>
                <th className="pb-2 pr-2">Fim</th>
                <th className="pb-2 pr-2 text-center">AL</th>
                <th className="pb-2 pr-2 text-center">CO</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {scheduleArray.fields.map((field, index) => (
                <tr key={field.id} className="border-t border-gray-50">
                  <td className="py-2 pr-2">
                    <select className="input-base" {...register(`schedule.${index}.phase`)}>
                      {PHASES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input type="date" className="input-base" {...register(`schedule.${index}.service_date`)} />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="time" className="input-base" {...register(`schedule.${index}.start_time`)} />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="time" className="input-base" {...register(`schedule.${index}.end_time`)} />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="number" min={0} className="input-base w-16 text-center" {...register(`schedule.${index}.cleaning_agents`)} />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="number" min={0} className="input-base w-16 text-center" {...register(`schedule.${index}.coordinators`)} />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => scheduleArray.remove(index)}
                      className="rounded p-1.5 text-gray-400 hover:text-danger"
                      title="Remover linha"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {errors.schedule && Array.isArray(errors.schedule) && (
          <p className="mt-2 text-xs text-danger">
            Verifique as datas do cronograma.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
        <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Precificação</h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              A quantidade de Agente, Coordenador, VR e VT soma automaticamente
              do cronograma acima. Para quantidade manual, use outra categoria
              (ex.: Extra ou Outro).
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              itemsArray.append({
                category: "Outro",
                description: "",
                quantity: 1,
                hours: "",
                unit_price: 0,
                is_internal_cost: true,
                show_on_proposal: false,
                notes: "",
              })
            }
            className="flex items-center gap-1.5 rounded-lg bg-brand-petrol/5 px-3 py-2 text-xs font-semibold text-brand-petrol hover:bg-brand-petrol/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="pb-2 pr-2">Categoria</th>
                <th className="pb-2 pr-2">Descrição</th>
                <th className="pb-2 pr-2 text-center">Qtd.</th>
                <th className="pb-2 pr-2 text-center">Horas</th>
                <th className="pb-2 pr-2">Valor unit. (R$)</th>
                <th className="pb-2 pr-2 text-right">Total</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {itemsArray.fields.map((field, index) => {
                const item = values.items?.[index];
                const qty = Number(item?.quantity) || 0;
                const hrs =
                  item?.hours === "" || item?.hours === undefined
                    ? 0
                    : Number(item.hours);
                const unit = Number(item?.unit_price) || 0;
                const total = itemTotal({
                  quantity: qty,
                  hours: hrs,
                  unit_price: unit,
                  category: item?.category,
                });
                const isCustomCategory =
                  item !== undefined &&
                  !(PRICING_CATEGORIES as readonly string[]).includes(
                    item.category
                  );
                const categoryReg = register(`items.${index}.category`);
                return (
                  <tr key={field.id} className="border-t border-gray-50 align-top">
                    <td className="py-2 pr-2">
                      {isCustomCategory ? (
                        <div className="flex items-center gap-1">
                          <input
                            className="input-base min-w-32"
                            placeholder="Nome da categoria"
                            autoFocus
                            {...categoryReg}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setValue(`items.${index}.category`, "Outro")
                            }
                            className="rounded p-1.5 text-gray-400 hover:text-brand-petrol"
                            title="Voltar para a lista de categorias"
                          >
                            <Undo2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <select
                          className="input-base"
                          {...categoryReg}
                          onChange={(e) => {
                            if (e.target.value === "__nova__") {
                              setValue(`items.${index}.category`, "");
                              return;
                            }
                            categoryReg.onChange(e);
                          }}
                        >
                          {PRICING_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          <option value="__nova__">➕ Criar nova categoria…</option>
                        </select>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <input className="input-base min-w-40" placeholder="Descrição" {...register(`items.${index}.description`)} />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        readOnly={autoQtyFor(item?.category ?? "") !== null}
                        title={
                          autoQtyFor(item?.category ?? "") !== null
                            ? "Preenchido automaticamente pelo cronograma"
                            : undefined
                        }
                        className={`input-base w-20 text-center ${
                          autoQtyFor(item?.category ?? "") !== null
                            ? "bg-teal-50 font-semibold text-brand-petrol"
                            : ""
                        }`}
                        {...register(`items.${index}.quantity`)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      {SEM_HORAS.includes(item?.category ?? "") ? (
                        <span className="block w-20 py-2 text-center text-ink-muted">
                          —
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="input-base w-20 text-center"
                          placeholder="—"
                          title="Agente/Coordenador: até 9h = 1 diária; da 10ª à 13ª hora soma a hora proporcional (diária ÷ 9); 14h ou mais = 2 diárias"
                          {...register(`items.${index}.hours`)}
                        />
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" min={0} step="0.01" className="input-base w-28" {...register(`items.${index}.unit_price`)} />
                    </td>
                    <td className="py-2 pr-2 text-right font-medium text-ink">
                      {formatMoney(total)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => itemsArray.remove(index)}
                        className="rounded p-1.5 text-gray-400 hover:text-danger"
                        title="Remover item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DisposablesCalculator
          defaultPublic={
            events.find((e) => e.id === values.event_id)?.estimated_public
          }
          onAdd={(description, total) =>
            itemsArray.append({
              category: "Material descartável",
              description,
              quantity: 1,
              hours: "",
              unit_price: total,
              is_internal_cost: true,
              show_on_proposal: false,
              notes: "",
            })
          }
        />

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 md:grid-cols-5">
          <Field label="Margem (%)" error={errors.margin_percent?.message}>
            <input type="number" min={0} max={1000} step="0.01" className="input-base" {...register("margin_percent")} />
          </Field>
          <Field label="BV (%)" error={errors.bv_percent?.message}>
            <input type="number" min={0} max={100} step="0.01" className="input-base" {...register("bv_percent")} />
          </Field>
          <Field label="Desconto (%)" error={errors.discount_percent?.message}>
            <input type="number" min={0} max={100} step="0.01" className="input-base" {...register("discount_percent")} />
          </Field>
          <Field label="Imposto NF (%)" error={errors.tax_percent_nf?.message}>
            <input type="number" min={0} max={100} step="0.01" className="input-base" {...register("tax_percent_nf")} />
          </Field>
          <Field label="Imposto Recibo (%)" error={errors.tax_percent_receipt?.message}>
            <input type="number" min={0} max={100} step="0.01" className="input-base" {...register("tax_percent_receipt")} />
          </Field>
        </div>

        <div className="mt-4 rounded-xl bg-brand-dark p-5 text-white">
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs text-gray-300">Custo total</p>
              <p className="font-semibold">{formatMoney(pricing.totalCost)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-300">Subtotal</p>
              <p className="font-semibold">{formatMoney(pricing.subtotal)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-300">Com Nota Fiscal</p>
              <p className="font-semibold">{formatMoney(pricing.totalNf)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-300">Com Recibo</p>
              <p className="font-semibold">{formatMoney(pricing.totalReceipt)}</p>
            </div>
          </div>
          <div className="mt-4 border-t border-white/15 pt-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs text-gray-300">
                  Valor final da proposta (
                  {values.emission_type === "recibo" ? "Recibo" : "Nota Fiscal"})
                </p>
                <p className="text-2xl font-bold text-brand-teal">
                  {formatMoney(finalTotal)}
                </p>
                <p className="mt-1 max-w-xl text-xs italic text-gray-300">
                  {valorPorExtenso(finalTotal)}
                </p>
              </div>
              <div className="text-right text-xs text-gray-300">
                {totalAgents > 0 && (
                  <p>
                    Valor por agente:{" "}
                    <span className="font-semibold text-white">
                      {formatMoney(finalTotal / totalAgents)}
                    </span>
                  </p>
                )}
                <p>
                  Margem estimada:{" "}
                  <span className="font-semibold text-white">
                    {formatMoney(finalTotal - pricing.totalCost - (values.emission_type === "recibo" ? pricing.taxesReceipt : pricing.taxesNf))}
                  </span>
                </p>
                {costPercents && (() => {
                  // Lucro real: mesma regra do Custo do Evento (Financeiro)
                  const pctTotal =
                    costPercents.custoFixo +
                    costPercents.encargos +
                    costPercents.diversos;
                  const indiretos = (finalTotal * pctTotal) / 100;
                  const impostos =
                    values.emission_type === "recibo"
                      ? pricing.taxesReceipt
                      : pricing.taxesNf;
                  const lucroReal =
                    finalTotal - pricing.totalCost - impostos - indiretos;
                  const lucroPct =
                    finalTotal > 0 ? (lucroReal / finalTotal) * 100 : 0;
                  return (
                    <p className="mt-1">
                      Lucro real estimado (c/ custo fixo{" "}
                      {costPercents.custoFixo}% + encargos{" "}
                      {costPercents.encargos}% + diversos{" "}
                      {costPercents.diversos}%):{" "}
                      <span
                        className={
                          lucroReal >= 0
                            ? "font-bold text-brand-teal"
                            : "font-bold text-red-400"
                        }
                      >
                        {formatMoney(lucroReal)} ({lucroPct.toFixed(1)}%)
                      </span>
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <FormSection
        title="Condições de pagamento"
        description="As responsabilidades vêm do cadastro do evento e entram automaticamente no PDF"
      >
        <Field label="Tipo de emissão" required error={errors.emission_type?.message}>
          <select className="input-base" {...register("emission_type")}>
            <option value="nota_fiscal">Nota Fiscal</option>
            <option value="recibo">Recibo</option>
          </select>
        </Field>
        <Field label="Forma de pagamento" error={errors.payment_terms?.message}>
          <input className="input-base" placeholder="Ex.: Contra entrega de Nota Fiscal" {...register("payment_terms")} />
        </Field>
        <Field label="Observações internas (não vão para o PDF)" className="md:col-span-2">
          <textarea rows={2} className="input-base" {...register("notes")} />
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/propostas")}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-gray-50"
        >
          Cancelar
        </button>
        <SubmitButton loading={loading}>
          {proposalId ? "Salvar alterações" : "Criar proposta"}
        </SubmitButton>
      </div>
    </form>
  );
}
