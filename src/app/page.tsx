import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteClients } from "@/components/site/SiteClients";
import {
  SiteHero,
  SiteServices,
  SiteEventOperation,
  SiteContactCTA,
  SiteFooter,
} from "@/components/site/SiteSections";

export const metadata: Metadata = {
  title: "Banho de Brilho — Limpeza profissional para eventos",
  description:
    "Especialistas em limpeza para eventos em Belo Horizonte: montagem, realização e desmontagem. Espaços limpos, organizados e prontos para grandes experiências.",
};

/** Site institucional público (usuário logado é levado direto ao dashboard) */
export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <SiteHero />
        <SiteServices />
        <SiteClients />
        <SiteEventOperation />
        <SiteContactCTA />
      </main>
      <SiteFooter />
    </>
  );
}
