"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { locationSchema, type LocationInput } from "@/lib/validations";
import {
  createLocationAction,
  updateLocationAction,
} from "@/lib/actions/locations";
import { BR_STATES } from "@/lib/constants";
import { FormSection } from "@/components/ui/FormSection";
import { Field, FormError, SubmitButton } from "@/components/forms/fields";

export interface LocationRow {
  id: string;
  name: string;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  soap_type: string | null;
  paper_towel_type: string | null;
  toilet_paper_type: string | null;
  trash_bag: string | null;
  fem_cb: number; fem_ph: number; fem_pt: number; fem_sb: number;
  masc_cb: number; masc_ph: number; masc_pt: number; masc_sb: number;
  pne_cb: number; pne_ph: number; pne_pt: number; pne_sb: number;
  notes: string | null;
}

/** Linhas da grade de banheiros (rótulos = cabeçalhos da planilha) */
const WC_ROWS = [
  { key: "fem", label: "WC Feminino" },
  { key: "masc", label: "WC Masculino" },
  { key: "pne", label: "WC PNE (acessível)" },
] as const;

const WC_COLS = [
  { key: "cb", label: "CB" },
  { key: "ph", label: "PH" },
  { key: "pt", label: "PT" },
  { key: "sb", label: "SB" },
] as const;

export function LocationForm({ location }: { location?: LocationRow }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: location
      ? {
          name: location.name,
          address: location.address ?? "",
          address_number: location.address_number ?? "",
          address_complement: location.address_complement ?? "",
          neighborhood: location.neighborhood ?? "",
          city: location.city ?? "",
          state: location.state ?? "",
          zip_code: location.zip_code ?? "",
          contact_name: location.contact_name ?? "",
          contact_phone: location.contact_phone ?? "",
          contact_email: location.contact_email ?? "",
          soap_type: location.soap_type ?? "",
          paper_towel_type: location.paper_towel_type ?? "",
          toilet_paper_type: location.toilet_paper_type ?? "",
          trash_bag: location.trash_bag ?? "",
          fem_cb: location.fem_cb, fem_ph: location.fem_ph, fem_pt: location.fem_pt, fem_sb: location.fem_sb,
          masc_cb: location.masc_cb, masc_ph: location.masc_ph, masc_pt: location.masc_pt, masc_sb: location.masc_sb,
          pne_cb: location.pne_cb, pne_ph: location.pne_ph, pne_pt: location.pne_pt, pne_sb: location.pne_sb,
          notes: location.notes ?? "",
        }
      : { state: "" },
  });

  const num = (name: string) => Number(watch(name as keyof LocationInput)) || 0;
  const colTotal = (col: string) =>
    num(`fem_${col}`) + num(`masc_${col}`) + num(`pne_${col}`);

  async function onSubmit(values: LocationInput) {
    setLoading(true);
    setServerError(null);
    const result = location
      ? await updateLocationAction(location.id, values)
      : await createLocationAction(values);
    if (!result.ok) {
      setServerError(result.error);
      setLoading(false);
      return;
    }
    router.push("/locais");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormError message={serverError} />

      <FormSection title="Local" description="Dados básicos e endereço do local do evento">
        <Field label="Nome do local" required className="md:col-span-2" error={errors.name?.message}>
          <input className="input-base" placeholder="Ex.: Mineirão, Expominas, Colégio Arnaldo" {...register("name")} />
        </Field>
        <Field label="Endereço (rua/avenida)" error={errors.address?.message}>
          <input className="input-base" placeholder="Ex.: Rua dos Timbiras" {...register("address")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Número" error={errors.address_number?.message}>
            <input className="input-base" placeholder="Ex.: 540" {...register("address_number")} />
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
          <input className="input-base" placeholder="Ex.: Belo Horizonte" {...register("city")} />
        </Field>
        <Field label="UF (Estado)" error={errors.state?.message}>
          <select className="input-base" {...register("state")}>
            <option value="">Selecione</option>
            {BR_STATES.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </Field>
      </FormSection>

      <FormSection title="Contato" description="Responsável pelo local (opcional)">
        <Field label="Nome do contato" error={errors.contact_name?.message}>
          <input className="input-base" placeholder="Ex.: Luiza Bréscia" {...register("contact_name")} />
        </Field>
        <Field label="Telefone" error={errors.contact_phone?.message}>
          <input className="input-base" placeholder="Ex.: 31 3524-5000" {...register("contact_phone")} />
        </Field>
        <Field label="E-mail" error={errors.contact_email?.message}>
          <input type="email" className="input-base" {...register("contact_email")} />
        </Field>
      </FormSection>

      <FormSection title="Descartáveis e suportes" description="Tipo de reposição usada em cada suporte do local">
        <Field label="Sabonete líquido" error={errors.soap_type?.message}>
          <input className="input-base" list="soap-opts" placeholder="Ex.: Refil caixa / Recipiente" {...register("soap_type")} />
          <datalist id="soap-opts">
            <option value="Refil caixa" />
            <option value="Recipiente" />
            <option value="Recip/Refil" />
          </datalist>
        </Field>
        <Field label="Papel toalha" error={errors.paper_towel_type?.message}>
          <input className="input-base" list="towel-opts" placeholder="Ex.: Bobina / Interfolhado" {...register("paper_towel_type")} />
          <datalist id="towel-opts">
            <option value="Bobina" />
            <option value="Interfolhado" />
            <option value="Bobina/Interfolhado" />
          </datalist>
        </Field>
        <Field label="Papel higiênico" error={errors.toilet_paper_type?.message}>
          <input className="input-base" list="tp-opts" placeholder="Ex.: Rolão 300m / Interfolhado" {...register("toilet_paper_type")} />
          <datalist id="tp-opts">
            <option value="Rolão 300m" />
            <option value="Interfolhado" />
            <option value="Rolinho" />
            <option value="Rolinho/Rolão" />
          </datalist>
        </Field>
        <Field label="Saco de lixo" error={errors.trash_bag?.message}>
          <input className="input-base" placeholder="Ex.: 20 - 100 - 200 litros" {...register("trash_bag")} />
        </Field>
      </FormSection>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
        <div className="mb-4 border-b border-gray-100 pb-3">
          <h2 className="text-base font-semibold text-ink">Banheiros do local</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Quantidade de suportes em cada banheiro — CB = cabines · PH = papel
            higiênico · PT = papel toalha · SB = sabonete
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="pb-2 pr-3">Banheiro</th>
                {WC_COLS.map((c) => (
                  <th key={c.key} className="pb-2 px-2 text-center">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WC_ROWS.map((row) => (
                <tr key={row.key} className="border-t border-gray-50">
                  <td className="py-2 pr-3 font-medium text-ink">{row.label}</td>
                  {WC_COLS.map((c) => (
                    <td key={c.key} className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        className="input-base w-16 text-center"
                        {...register(`${row.key}_${c.key}` as keyof LocationInput)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 bg-surface">
                <td className="py-2 pr-3 font-semibold text-brand-petrol">Total</td>
                {WC_COLS.map((c) => (
                  <td key={c.key} className="py-2 px-2 text-center font-semibold text-brand-petrol">
                    {colTotal(c.key)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <FormSection title="Observações">
        <Field label="Observações do local" className="md:col-span-2">
          <textarea rows={3} className="input-base" placeholder="Ex.: entrega pelo portão dos fundos, contato do zelador..." {...register("notes")} />
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/locais")}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-gray-50"
        >
          Cancelar
        </button>
        <SubmitButton loading={loading}>
          {location ? "Salvar alterações" : "Cadastrar local"}
        </SubmitButton>
      </div>
    </form>
  );
}
