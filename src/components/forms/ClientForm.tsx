"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientInput } from "@/lib/validations";
import { createClientAction, updateClientAction } from "@/lib/actions/clients";
import { CLIENT_TYPES, BR_STATES } from "@/lib/constants";
import { FormSection } from "@/components/ui/FormSection";
import { Field, FormError, SubmitButton } from "@/components/forms/fields";
import type { Client } from "@/types";

export function ClientForm({ client }: { client?: Client }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: client
      ? {
          type: client.type,
          name: client.name,
          legal_name: client.legal_name ?? "",
          document: client.document ?? "",
          email: client.email ?? "",
          phone: client.phone ?? "",
          address: client.address ?? "",
          address_number: client.address_number ?? "",
          address_complement: client.address_complement ?? "",
          neighborhood: client.neighborhood ?? "",
          city: client.city ?? "",
          state: client.state ?? "",
          zip_code: client.zip_code ?? "",
          notes: client.notes ?? "",
        }
      : { type: "empresa" },
  });

  async function onSubmit(values: ClientInput) {
    setLoading(true);
    setServerError(null);

    const result = client
      ? await updateClientAction(client.id, values)
      : await createClientAction(values);

    if (!result.ok) {
      setServerError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/clientes/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormError message={serverError} />

      <FormSection
        title="Dados do cliente"
        description="Informações principais para propostas e contratos"
      >
        <Field label="Tipo" required error={errors.type?.message}>
          <select className="input-base" {...register("type")}>
            {CLIENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nome / Nome fantasia" required error={errors.name?.message}>
          <input
            className="input-base"
            placeholder="Ex.: Unimed BH"
            {...register("name")}
          />
        </Field>
        <Field label="Razão social" error={errors.legal_name?.message}>
          <input className="input-base" {...register("legal_name")} />
        </Field>
        <Field label="CNPJ ou CPF" error={errors.document?.message}>
          <input
            className="input-base"
            placeholder="00.000.000/0000-00"
            {...register("document")}
          />
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          <input
            type="email"
            className="input-base"
            placeholder="contato@empresa.com.br"
            {...register("email")}
          />
        </Field>
        <Field label="Telefone" error={errors.phone?.message}>
          <input
            className="input-base"
            placeholder="(31) 99999-9999"
            {...register("phone")}
          />
        </Field>
      </FormSection>

      <FormSection title="Endereço">
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
            <input className="input-base" placeholder="Ex.: Sala 301" {...register("address_complement")} />
          </Field>
        </div>
        <Field label="Bairro" error={errors.neighborhood?.message}>
          <input className="input-base" placeholder="Ex.: Funcionários" {...register("neighborhood")} />
        </Field>
        <Field label="Cidade" error={errors.city?.message}>
          <input className="input-base" {...register("city")} />
        </Field>
        <Field label="UF" error={errors.state?.message}>
          <select className="input-base" {...register("state")}>
            <option value="">Selecione</option>
            {BR_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </Field>
        <Field label="CEP" error={errors.zip_code?.message}>
          <input className="input-base" placeholder="00000-000" {...register("zip_code")} />
        </Field>
      </FormSection>

      <FormSection title="Observações">
        <Field label="Anotações internas" className="md:col-span-2">
          <textarea rows={3} className="input-base" {...register("notes")} />
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/clientes")}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-gray-50"
        >
          Cancelar
        </button>
        <SubmitButton loading={loading}>
          {client ? "Salvar alterações" : "Cadastrar cliente"}
        </SubmitButton>
      </div>
    </form>
  );
}
