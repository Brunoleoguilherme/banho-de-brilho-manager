import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  // Propostas
  rascunho: "bg-gray-100 text-gray-700",
  em_revisao_interna: "bg-purple-100 text-purple-800",
  enviada: "bg-blue-100 text-blue-800",
  em_negociacao: "bg-amber-100 text-amber-800",
  aprovada: "bg-green-100 text-green-800",
  recusada: "bg-red-100 text-red-700",
  cancelada: "bg-gray-200 text-gray-600",
  convertida_contrato: "bg-teal-100 text-teal-800",
  convertida_os: "bg-teal-100 text-teal-800",
  // Contratos
  gerado: "bg-gray-100 text-gray-700",
  enviado: "bg-blue-100 text-blue-800",
  assinado: "bg-green-100 text-green-800",
  cancelado: "bg-gray-200 text-gray-600",
  // Ordens de serviço
  criada: "bg-gray-100 text-gray-700",
  em_planejamento: "bg-purple-100 text-purple-800",
  equipe_pendente: "bg-amber-100 text-amber-800",
  materiais_pendentes: "bg-amber-100 text-amber-800",
  transporte_pendente: "bg-amber-100 text-amber-800",
  confirmada: "bg-blue-100 text-blue-800",
  em_execucao: "bg-teal-100 text-teal-800",
  finalizada: "bg-green-100 text-green-800",
  em_conferencia: "bg-purple-100 text-purple-800",
  encerrada: "bg-gray-200 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  em_revisao_interna: "Em revisão interna",
  enviada: "Enviada",
  em_negociacao: "Em negociação",
  aprovada: "Aprovada",
  recusada: "Recusada",
  cancelada: "Cancelada",
  convertida_contrato: "Convertida em contrato",
  convertida_os: "Convertida em OS",
  gerado: "Gerado",
  enviado: "Enviado",
  assinado: "Assinado",
  cancelado: "Cancelado",
  criada: "Criada",
  em_planejamento: "Em planejamento",
  equipe_pendente: "Equipe pendente",
  materiais_pendentes: "Materiais pendentes",
  transporte_pendente: "Transporte pendente",
  confirmada: "Confirmada",
  em_execucao: "Em execução",
  finalizada: "Finalizada",
  em_conferencia: "Em conferência",
  encerrada: "Encerrada",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
