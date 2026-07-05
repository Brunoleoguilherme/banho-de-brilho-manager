import { PageHeader } from "@/components/layout/PageHeader";
import { ImportWizard } from "@/components/import/ImportWizard";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Importar planilhas antigas"
        description="Suba um CSV, ligue as colunas e confirme — em 3 passos"
      />
      <ImportWizard />
    </div>
  );
}
