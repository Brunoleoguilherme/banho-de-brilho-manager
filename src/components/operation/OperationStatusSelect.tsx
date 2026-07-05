"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateOperationStatusAction } from "@/lib/actions/operations";

export const OS_STATUS_OPTIONS = [
  { value: "criada", label: "Criada" },
  { value: "em_planejamento", label: "Em planejamento" },
  { value: "equipe_pendente", label: "Equipe pendente" },
  { value: "materiais_pendentes", label: "Materiais pendentes" },
  { value: "transporte_pendente", label: "Transporte pendente" },
  { value: "confirmada", label: "Confirmada" },
  { value: "em_execucao", label: "Em execução" },
  { value: "finalizada", label: "Finalizada" },
  { value: "em_conferencia", label: "Em conferência" },
  { value: "encerrada", label: "Encerrada" },
];

export function OperationStatusSelect({
  osId,
  status,
}: {
  osId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLoading(true);
    await updateOperationStatusAction(osId, e.target.value);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {loading && <Loader2 className="h-4 w-4 animate-spin text-brand-petrol" />}
      <select
        className="input-base w-auto font-medium"
        defaultValue={status}
        onChange={handleChange}
        disabled={loading}
      >
        {OS_STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
