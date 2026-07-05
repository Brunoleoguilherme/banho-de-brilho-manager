"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  employeeSchema,
  type EmployeeInput,
  EMPLOYEE_ROLES,
  EMPLOYEE_STATUSES,
} from "@/lib/validations/employee";
import {
  createEmployeeAction,
  updateEmployeeAction,
} from "@/lib/actions/employees";
import { BR_STATES } from "@/lib/constants";
import { FormSection } from "@/components/ui/FormSection";
import { Field, FormError, SubmitButton } from "@/components/forms/fields";

interface EmployeeFormProps {
  employeeId?: string;
  defaultValues?: Partial<EmployeeInput>;
}

export function EmployeeForm({ employeeId, defaultValues }: EmployeeFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: defaultValues ?? {
      main_role: "agente_limpeza",
      status: "ativo",
      daily_rate: 0,
      hourly_rate: 0,
      vr_rate: 0,
      vt_rate: 0,
    },
  });

  async function onSubmit(values: EmployeeInput) {
    setLoading(true);
    setServerError(null);

    const result = employeeId
      ? await updateEmployeeAction(employeeId, values)
      : await createEmployeeAction(values);

    if (!result.ok) {
      setServerError(result.error);
      setLoading(false);
      return;
    }
    router.push("/funcionarios");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormError message={serverError} />

      <FormSection title="Dados pessoais">
        <Field label="Tipo de colaborador" required error={errors.employee_type?.message}>
          <select className="input-base" {...register("employee_type")}>
            <option value="funcionario">Funcionário</option>
            <option value="freelancer">Free Lancer</option>
          </select>
        </Field>
        <Field label="Nome completo" required error={errors.full_name?.message}>
          <input className="input-base" {...register("full_name")} />
        </Field>
        <Field label="CPF" error={errors.document?.message}>
          <input className="input-base" placeholder="000.000.000-00" {...register("document")} />
        </Field>
        <Field label="RG" error={errors.rg?.message}>
          <input className="input-base" placeholder="MG-00.000.000" {...register("rg")} />
        </Field>
        <Field label="Telefone / WhatsApp" error={errors.phone?.message}>
          <input className="input-base" placeholder="(31) 99999-9999" {...register("phone")} />
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          <input className="input-base" {...register("email")} />
        </Field>
        <Field label="Endereço (rua/avenida)" error={errors.address?.message}>
          <input className="input-base" placeholder="Ex.: Rua Ipê Mirim" {...register("address")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Número" error={errors.address_number?.message}>
            <input className="input-base" placeholder="Ex.: 255" {...register("address_number")} />
          </Field>
          <Field label="Complemento" error={errors.address_complement?.message}>
            <input className="input-base" placeholder="Ex.: CX4, Apto 101" {...register("address_complement")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bairro" error={errors.neighborhood?.message}>
            <input className="input-base" placeholder="Ex.: Etelvina Carneiro" {...register("neighborhood")} />
          </Field>
          <Field label="CEP" error={errors.zip_code?.message}>
            <input className="input-base" placeholder="00000-000" {...register("zip_code")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cidade" error={errors.city?.message}>
            <input className="input-base" {...register("city")} />
          </Field>
          <Field label="UF" error={errors.state?.message}>
            <select className="input-base" {...register("state")}>
              <option value="">—</option>
              {BR_STATES.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Função e valores padrão">
        <Field label="Função principal" required error={errors.main_role?.message}>
          <select className="input-base" {...register("main_role")}>
            {EMPLOYEE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Funções secundárias" error={errors.secondary_roles?.message}>
          <input className="input-base" placeholder="Ex.: Apoio, Motorista" {...register("secondary_roles")} />
        </Field>
        <Field label="Diária padrão (R$)" error={errors.daily_rate?.message}>
          <input type="number" min={0} step="0.01" className="input-base" {...register("daily_rate")} />
        </Field>
        <Field label="Valor hora padrão (R$)" error={errors.hourly_rate?.message}>
          <input type="number" min={0} step="0.01" className="input-base" {...register("hourly_rate")} />
        </Field>
        <Field label="VR padrão (R$)" error={errors.vr_rate?.message}>
          <input type="number" min={0} step="0.01" className="input-base" {...register("vr_rate")} />
        </Field>
        <Field label="VT padrão (R$)" error={errors.vt_rate?.message}>
          <input type="number" min={0} step="0.01" className="input-base" {...register("vt_rate")} />
        </Field>
      </FormSection>

      <FormSection title="Pagamento e situação">
        <Field label="Chave PIX" error={errors.pix_key?.message}>
          <input className="input-base" {...register("pix_key")} />
        </Field>
        <Field label="Banco / agência / conta" error={errors.bank_info?.message}>
          <input className="input-base" placeholder="Ex.: Caixa – Ag 1234 – CC 56789-0" {...register("bank_info")} />
        </Field>
        <Field label="Status" required error={errors.status?.message}>
          <select className="input-base" {...register("status")}>
            {EMPLOYEE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Observações" className="md:col-span-2">
          <textarea rows={2} className="input-base" {...register("notes")} />
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/funcionarios")}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-gray-50"
        >
          Cancelar
        </button>
        <SubmitButton loading={loading}>
          {employeeId ? "Salvar alterações" : "Cadastrar funcionário"}
        </SubmitButton>
      </div>
    </form>
  );
}
