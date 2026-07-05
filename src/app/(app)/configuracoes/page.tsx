import Link from "next/link";
import { FileUp, Users, FileText, ChevronRight, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Administração do sistema"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/configuracoes/importar"
          className="group rounded-xl border border-gray-100 bg-white p-6 shadow-card transition hover:border-brand-teal/40 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-petrol/10 text-brand-petrol">
                <FileUp className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-ink group-hover:text-brand-petrol">
                Importar planilhas antigas
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Traga funcionários, clientes e despesas das planilhas Excel/CSV
                para o sistema.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300 transition group-hover:text-brand-petrol" />
          </div>
        </Link>

        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-gray-100 bg-white p-6 shadow-card transition hover:border-brand-teal/40 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-warning">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-ink group-hover:text-brand-petrol">
                Usuários e permissões
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Crie usuários em Authentication &gt; Users no painel do Supabase
                e defina o papel na tabela profiles (admin, comercial,
                operacional, financeiro, gestor ou consulta).
              </p>
            </div>
            <ExternalLink className="h-5 w-5 text-gray-300 transition group-hover:text-brand-petrol" />
          </div>
        </a>

        <div className="rounded-xl border border-dashed border-gray-200 bg-white/50 p-6">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-gray-400">
            Templates de documentos
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Edição dos textos de proposta e contrato — em breve. Hoje os
            modelos seguem o padrão BBP automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
