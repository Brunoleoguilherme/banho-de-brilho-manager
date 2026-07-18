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
import {
  calculatePricing,
  itemTotal,
  SEM_HORAS,
  solveMarginForTarget,
} from "@/lib/money/pricing";
import { valorPorExtenso } from "@/lib/money/extenso";
import { formatMoney } from "@/lib/utils";
import { FormSection } from "@/components/ui/FormSection";
import { Field, FormError, SubmitButton } from "@/components/forms/fields";
import { DisposablesCalculator } from "@/components/proposals/DisposablesCalculator";

const PHASES = [
  { value: "continuo", label: "Turno contínuo" },
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

const PHASE_ORDER = { continuo: -1, montagem: 0, realizacao: 1, desmontagem: 2 } as const;

/** Horas do turno a partir de "HH:MM" (trata a virada da meia-noite) */
function shiftHours(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let h = eh + em / 60 - (sh + sm / 60);
  if (h <= 0) h += 24;
  return h;
}
/** Abaixo de 9h paga o mínimo de 9h (padrão da BB) */
function billedHours(h: number): number {
  return h > 0 && h < 9 ? 9 : h;
}
/** VR por faixa: <10h = 1 refeição; 10–13h = refeição + lanche; >13h = 2 refeições */
function vrForHours(refeicao: number, lanche: number, h: number): number {
  if (h <= 0) return 0;
  if (h < 10) return refeicao;
  if (h <= 13) return refeicao + lanche;
  return refeicao * 2;
}
/** Categorias geradas automaticamente pelo cronograma (não editáveis à mão) */
const MANAGED_LABOR = ["Agente de limpeza", "Coordenador", "Vale-refeição"];

interface ProposalFormProps {
  events: {
    id: string;
    name: string;
    client_name: string;
    client_email?: string;
    client_phone?: string;
    /** Solicitante cadastrado no evento (A/c) — tem prioridade sobre o cliente */
    requester_name?: string;
    requester_email?: string;
    requester_phone?: string;
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
  const [targetValue, setTargetValue] = useState("");
  const [margemInfo, setMargemInfo] = useState<string | null>(null);
  const [rates, setRates] = useState(() => {
    const its = defaultValues?.items ?? [];
    const ag = its.find((i) => i.category === "Agente de limpeza");
    const co = its.find((i) => i.category === "Coordenador");
    const vrLow = its.find(
      (i) => i.category === "Vale-refeição" && Number(i.unit_price) <= 25
    );
    const vrMid = its.find(
      (i) =>
        i.category === "Vale-refeição" &&
        Number(i.unit_price) > 25 &&
        Number(i.unit_price) < 38
    );
    const refeicao = vrLow ? Number(vrLow.unit_price) || 19 : 19;
    return {
      agenteDiaria: ag ? Number(ag.unit_price) || 108 : 108,
      coordDiaria: co ? Number(co.unit_price) || 216 : 216,
      refeicao,
      lanche: vrMid ? Math.max(0, Number(vrMid.unit_price) - refeicao) : 11,
    };
  });

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
      items: [],
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

    const ev = events.find((e) => e.id === watchedEventId);
    // Auto-preenche o contato responsável (A/c) a partir do SOLICITANTE do evento.
    // Cai para o cadastro do cliente quando o evento não tem solicitante.
    // Só preenche campo vazio, para não sobrescrever edições feitas na proposta.
    if (ev?.requester_name && !watch("contact_name")) {
      setValue("contact_name", ev.requester_name);
    }
    const emailFromEvent = ev?.requester_email || ev?.client_email;
    if (emailFromEvent && !watch("contact_email")) {
      setValue("contact_email", emailFromEvent);
    }
    const phoneFromEvent = ev?.requester_phone || ev?.client_phone;
    if (phoneFromEvent && !watch("contact_phone")) {
      setValue("contact_phone", phoneFromEvent);
    }

    const eventSchedules = ev?.schedules ?? [];
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

  const isManaged = (category?: string) =>
    MANAGED_LABOR.includes(category ?? "");

  // Gera automaticamente as linhas de Agente, Coordenador e Vale-refeição a
  // partir do cronograma — cada faixa de horas com o seu próprio valor de
  // diária/refeição. Vale-transporte fica manual; materiais/extras preservados.
  const scheduleSig = JSON.stringify(
    (values.schedule ?? []).map((s) => [
      s.start_time,
      s.end_time,
      s.cleaning_agents,
      s.coordinators,
    ])
  );
  const ratesSig = JSON.stringify(rates);
  useEffect(() => {
    const sched = values.schedule ?? [];
    const agentByH = new Map<number, number>();
    const coordByH = new Map<number, number>();
    const vrByBand = new Map<string, number>();
    for (const s of sched) {
      const h = billedHours(shiftHours(s.start_time, s.end_time));
      const al = Number(s.cleaning_agents) || 0;
      const co = Number(s.coordinators) || 0;
      if (h > 0 && al > 0) agentByH.set(h, (agentByH.get(h) || 0) + al);
      if (h > 0 && co > 0) coordByH.set(h, (coordByH.get(h) || 0) + co);
      const ppl = al + co;
      if (h > 0 && ppl > 0) {
        const band = h < 10 ? "ate9" : h <= 13 ? "a10a13" : "mais13";
        vrByBand.set(band, (vrByBand.get(band) || 0) + ppl);
      }
    }
    const managed: ProposalInput["items"] = [];
    for (const [h, qty] of [...agentByH.entries()].sort((a, b) => a[0] - b[0])) {
      managed.push({
        category: "Agente de limpeza",
        description: `Agente de limpeza (${h}h)`,
        quantity: qty,
        hours: h,
        unit_price: rates.agenteDiaria,
        is_internal_cost: true,
        show_on_proposal: true,
        notes: "",
      });
    }
    for (const [h, qty] of [...coordByH.entries()].sort((a, b) => a[0] - b[0])) {
      managed.push({
        category: "Coordenador",
        description: `Coordenador (${h}h)`,
        quantity: qty,
        hours: h,
        unit_price: rates.coordDiaria,
        is_internal_cost: true,
        show_on_proposal: true,
        notes: "",
      });
    }
    const bandInfo: Record<string, { label: string; hours: number }> = {
      ate9: { label: "até 9h", hours: 9 },
      a10a13: { label: "10–13h", hours: 12 },
      mais13: { label: "acima de 13h", hours: 14 },
    };
    for (const band of ["ate9", "a10a13", "mais13"]) {
      const ppl = vrByBand.get(band);
      if (!ppl) continue;
      const info = bandInfo[band];
      managed.push({
        category: "Vale-refeição",
        description: `Vale-refeição (${info.label})`,
        quantity: ppl,
        hours: "",
        unit_price: vrForHours(rates.refeicao, rates.lanche, info.hours),
        is_internal_cost: true,
        show_on_proposal: false,
        notes: "",
      });
    }
    const others = (values.items ?? []).filter((i) => !isManaged(i.category));
    itemsArray.replace([...managed, ...others]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSig, ratesSig]);

  // Modo inverso: informa o valor final e o sistema acha a margem
  function aplicarMargemPeloValor() {
    const alvo = Number(targetValue) || 0;
    const itens = (values.items ?? []).map((i) => ({
      quantity: Number(i.quantity) || 0,
      hours: i.hours === "" || i.hours === undefined ? null : Number(i.hours),
      unit_price: Number(i.unit_price) || 0,
      is_internal_cost: !!i.is_internal_cost,
      category: i.category,
    }));
    const m = solveMarginForTarget(
      alvo,
      itens,
      {
        bv_percent: Number(values.bv_percent) || 0,
        discount_percent: Number(values.discount_percent) || 0,
        tax_percent_nf: Number(values.tax_percent_nf) || 0,
        tax_percent_receipt: Number(values.tax_percent_receipt) || 0,
      },
      values.emission_type === "recibo" ? "recibo" : "nota_fiscal"
    );
    if (m === null) {
      setMargemInfo("Preencha os itens e um valor final maior que zero.");
      return;
    }
    const aplicada = Math.max(-100, Math.min(1000, m));
    setValue("margin_percent", aplicada);
    const fmt = m.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    setMargemInfo(
      m < 0
        ? `Margem calculada: ${fmt}% — atencao: abaixo do custo.`
        : `Margem aplicada: ${fmt}%.`
    );
  }

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
        <button
          type="button"
          onClick={() =>
            scheduleArray.append({
              phase: "continuo",
              service_date: "",
              start_time: "",
              end_time: "",
              cleaning_agents: 0,
              coordinators: 0,
              notes: "",
            })
          }
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-petrol/5 px-3 py-2 text-xs font-semibold text-brand-petrol hover:bg-brand-petrol/10"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar turno contínuo
        </button>
        <p className="mt-2 text-xs text-ink-muted">
          Turno contínuo: use quando os MESMOS funcionários trabalham direto por
          várias fases — o sistema soma as horas e aplica a diária pelo total do
          período (ex.: 09h às 02h = 17h = 2 diárias). Nas fases (montagem,
          realização, desmontagem) deixe apenas o reforço/substituição de quem
          não é contínuo, para não contar a mesma pessoa duas vezes.
        </p>
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
              Agente, Coordenador e Vale-refeição são calculados automaticamente
              por turno (cada faixa de horas com seu valor). Vale-transporte é
              manual por turno; materiais e extras você adiciona abaixo.
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

        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-surface p-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Diária do agente (R$)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input-base"
              value={rates.agenteDiaria}
              onChange={(e) =>
                setRates({ ...rates, agenteDiaria: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Diária do coordenador (R$)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input-base"
              value={rates.coordDiaria}
              onChange={(e) =>
                setRates({ ...rates, coordDiaria: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Refeição (R$)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input-base"
              value={rates.refeicao}
              onChange={(e) =>
                setRates({ ...rates, refeicao: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Lanche (R$)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input-base"
              value={rates.lanche}
              onChange={(e) =>
                setRates({ ...rates, lanche: Number(e.target.value) || 0 })
              }
            />
          </div>
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
                        readOnly={isManaged(item?.category)}
                        title={
                          isManaged(item?.category)
                            ? "Calculado automaticamente pelo cronograma"
                            : undefined
                        }
                        className={`input-base w-20 text-center ${
                          isManaged(item?.category)
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
                          readOnly={isManaged(item?.category)}
                          className={`input-base w-20 text-center ${
                            isManaged(item?.category)
                              ? "bg-teal-50 font-semibold text-brand-petrol"
                              : ""
                          }`}
                          placeholder="—"
                          title="Calculado pelo cronograma: até 9h = 1 diária; 9–13h = proporcional; acima de 13h = 2 diárias"
                          {...register(`items.${index}.hours`)}
                        />
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {isManaged(item?.category) ? (
                        <div
                          title={
                            item?.category === "Agente de limpeza" ||
                            item?.category === "Coordenador"
                              ? "Diária conforme as horas do turno"
                              : "Calculado automaticamente"
                          }
                          className="input-base w-28 bg-teal-50 font-semibold text-brand-petrol"
                        >
                          {formatMoney(
                            item?.category === "Agente de limpeza" ||
                              item?.category === "Coordenador"
                              ? itemTotal({
                                  quantity: 1,
                                  hours: hrs,
                                  unit_price: unit,
                                  category: item?.category,
                                })
                              : unit
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          title="Clique para editar o valor"
                          onClick={() => {
                            const ans = prompt(
                              "Valor unitário (R$):",
                              unit ? String(unit).replace(".", ",") : ""
                            );
                            if (ans === null) return;
                            const raw = ans.trim().replace(/[R$\s]/g, "");
                            const num =
                              Number(
                                raw.includes(",")
                                  ? raw.replace(/\./g, "").replace(",", ".")
                                  : raw
                              ) || 0;
                            setValue(`items.${index}.unit_price`, num);
                          }}
                          className="input-base w-28 text-left hover:border-brand-teal"
                        >
                          {formatMoney(unit)}
                        </button>
                      )}
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
            <input type="number" min={-100} max={1000} step="0.0001" className="input-base" {...register("margin_percent")} />
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

        <div className="mt-4 rounded-lg border border-dashed border-brand-teal/40 bg-teal-50/30 p-4">
          <p className="mb-2 text-sm font-semibold text-brand-petrol">
            Achar a margem pelo valor final
          </p>
          <p className="mb-3 text-xs text-ink-muted">
            Para analisar contrapropostas: informe o valor final desejado (na
            emissao{" "}
            {values.emission_type === "recibo" ? "Recibo" : "Nota Fiscal"}) e o
            sistema calcula a margem, mantendo BV, desconto e impostos.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Valor final desejado (R$)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input-base w-40"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="Ex.: 286.20"
              />
            </div>
            <button
              type="button"
              onClick={aplicarMargemPeloValor}
              className="rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Calcular margem
            </button>
            {margemInfo && (
              <span className="text-xs font-medium text-ink">{margemInfo}</span>
            )}
          </div>
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
        <Field label="Data de vencimento do pagamento" error={errors.payment_due_date?.message}>
          <input type="date" className="input-base" {...register("payment_due_date")} />
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
