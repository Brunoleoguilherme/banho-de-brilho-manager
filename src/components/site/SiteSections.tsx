import Link from "next/link";
import {
  FileText,
  MessageCircle,
  BadgeCheck,
  Construction,
  Sparkles,
  Recycle,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  LogIn,
} from "lucide-react";
import { SiteLogo } from "./SiteLogo";
import { SITE } from "@/lib/site";

const BTN_VERDE =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#A8CF00] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105";
const BTN_BORDA =
  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#69A9CF] bg-white px-6 py-3.5 text-sm font-bold text-[#0F2742] transition hover:bg-[#69A9CF]/10";

/* ============================== HERO ============================== */

const DIFERENCIAIS = [
  "Equipe treinada e qualificada",
  "Materiais e equipamentos de alta performance",
  "Compromisso com prazos e resultados",
];

function LeafPattern({ green = false }: { green?: boolean }) {
  const c1 = green ? "#A8CF00" : "#69A9CF";
  return (
    <svg width="120" height="200" viewBox="0 0 120 200" fill="none" aria-hidden>
      <path d="M40 0 A40 40 0 0 1 80 40 L40 40 Z" fill={c1} opacity="0.35" />
      <path d="M38 42 L38 82 A40 40 0 0 1 -2 42 Z" fill={c1} opacity="0.35" />
      <path d="M40 84 A40 40 0 0 1 80 124 L40 124 Z" fill="#A8CF00" opacity="0.4" />
      <path d="M38 126 L38 166 A40 40 0 0 1 -2 126 Z" fill="#A8CF00" opacity="0.4" />
      <path d="M82 42 A40 40 0 0 1 122 82 L82 82 Z" fill={c1} opacity="0.25" />
      <path d="M82 126 L122 126 A40 40 0 0 1 82 166 Z" fill="#A8CF00" opacity="0.3" />
    </svg>
  );
}

export function SiteHero() {
  return (
    <section id="home" className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute -left-10 top-24 hidden opacity-70 lg:block">
        <LeafPattern />
      </div>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8CF00]">
            Especialistas em limpeza para eventos
          </p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight text-[#0F2742] sm:text-5xl">
            Do início ao fim,
            <br />
            <span className="text-[#A8CF00]">cuidamos do seu evento.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[#64748B]">
            Cobertura completa com montagem, realização e desmontagem. Espaços
            limpos, organizados e prontos para grandes experiências.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#contato" className={BTN_VERDE}>
              <FileText className="h-4 w-4" />
              Solicitar proposta
            </a>
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={BTN_BORDA}
            >
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          </div>

          <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {DIFERENCIAIS.map((d) => (
              <li key={d} className="flex items-start gap-2">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#A8CF00]" />
                <span className="text-sm font-medium text-[#0F2742]/80">{d}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Imagem principal — salve em /public/images/hero-eventos.jpg */}
        <div className="relative">
          <div
            className="aspect-[4/3] w-full overflow-hidden rounded-[2.5rem] rounded-tl-[6rem] bg-cover bg-center shadow-xl"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(105,169,207,0.25), rgba(168,207,0,0.2)), url('/images/hero-eventos.jpg')",
              backgroundColor: "#E8F0F7",
            }}
            role="img"
            aria-label="Equipe Banho de Brilho realizando limpeza em espaço de eventos"
          />
          <div className="absolute -right-4 bottom-10 hidden lg:block">
            <LeafPattern green />
          </div>
        </div>
      </div>

      <div className="h-3 w-full bg-gradient-to-r from-[#A8CF00] via-[#A8CF00] to-[#69A9CF]" />
    </section>
  );
}

/* ============================ SERVIÇOS ============================ */

const SERVICOS = [
  {
    icon: Construction,
    title: "Montagem de Eventos",
    text: "Preparação completa do espaço antes do início do evento.",
  },
  {
    icon: Sparkles,
    title: "Realização de Eventos",
    text: "Equipe de limpeza e apoio durante toda a execução do evento.",
  },
  {
    icon: Recycle,
    title: "Desmontagem de Eventos",
    text: "Limpeza final e organização do espaço após o encerramento.",
  },
];

export function SiteServices() {
  return (
    <section id="eventos" className="bg-white py-16 lg:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8CF00]">
          Nossos serviços
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#0F2742] sm:text-3xl">
          Soluções completas para eventos do início ao fim
        </h2>
        <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[#A8CF00]" />

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICOS.map((s) => (
            <div
              key={s.title}
              className="group rounded-2xl border border-slate-100 bg-white p-8 shadow-card transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#69A9CF]/15 to-[#A8CF00]/15">
                <s.icon className="h-8 w-8 text-[#69A9CF]" />
              </div>
              <h3 className="mt-6 text-lg font-bold text-[#0F2742]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{s.text}</p>
              <a
                href="#contato"
                className="mt-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#A8CF00]/40 text-[#A8CF00] transition group-hover:bg-[#A8CF00] group-hover:text-white"
                aria-label={`Solicitar proposta de ${s.title}`}
              >
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ====================== ATUAÇÃO EM EVENTOS ======================= */

export function SiteEventOperation() {
  return (
    <section className="bg-gradient-to-br from-white to-[#F5F7FA] py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8CF00]">
            Compromisso com a excelência
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#0F2742] sm:text-3xl">
            Seu evento, nossa missão.
            <br />
            Do planejamento ao último detalhe.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#64748B]">
            Atuamos com precisão em cada etapa: montagem, realização e
            desmontagem. Entregamos espaços impecáveis para que você foque no
            que realmente importa: o sucesso do seu evento.
          </p>
        </div>

        {/* Imagem — salve em /public/images/evento-operacao.jpg */}
        <div
          className="aspect-video w-full overflow-hidden rounded-3xl bg-cover bg-center shadow-xl"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(15,39,66,0.15), rgba(105,169,207,0.15)), url('/images/evento-operacao.jpg')",
            backgroundColor: "#DCE8F2",
          }}
          role="img"
          aria-label="Operação de limpeza da Banho de Brilho em evento"
        />
      </div>
    </section>
  );
}

/* ============================ CONTATO ============================= */

export function SiteContactCTA() {
  return (
    <section id="contato" className="relative overflow-hidden bg-[#0F2742] py-16 lg:py-20">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#69A9CF]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#A8CF00]/20 blur-3xl" />

      <div className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
          Solicite uma proposta para o seu evento
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70">
          Nossa equipe está pronta para entender sua demanda e montar uma
          operação sob medida para o seu evento.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={SITE.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={BTN_VERDE}
          >
            <MessageCircle className="h-4 w-4" />
            Falar no WhatsApp
          </a>
          <a
            href={`mailto:${SITE.email}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/15"
          >
            <Mail className="h-4 w-4" />
            Enviar e-mail
          </a>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            { icon: Phone, label: "Telefone", valor: SITE.telefone },
            { icon: Mail, label: "E-mail", valor: SITE.email },
            { icon: MapPin, label: "Endereço", valor: SITE.endereco },
          ].map((c) => (
            <div key={c.label} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4">
              <c.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#A8CF00]" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  {c.label}
                </p>
                <p className="break-words text-sm font-semibold text-white">{c.valor}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================= FOOTER ============================= */

export function SiteFooter() {
  return (
    <footer className="bg-gradient-to-b from-[#F5F7FA] to-[#E4EDF5]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <SiteLogo className="h-12 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#64748B]">
            Especialistas em limpeza profissional para eventos, com atuação em
            montagem, realização e desmontagem.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0F2742]/60">
            Navegação
          </p>
          <ul className="mt-4 space-y-2 text-sm font-medium text-[#64748B]">
            <li><a href="#home" className="hover:text-[#0F2742]">Home</a></li>
            <li><a href="#eventos" className="hover:text-[#0F2742]">Eventos</a></li>
            <li><a href="#clientes" className="hover:text-[#0F2742]">Clientes</a></li>
            <li><a href="#contato" className="hover:text-[#0F2742]">Contato</a></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0F2742]/60">
            Serviços
          </p>
          <ul className="mt-4 space-y-2 text-sm font-medium text-[#64748B]">
            <li>Montagem de Eventos</li>
            <li>Realização de Eventos</li>
            <li>Desmontagem de Eventos</li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0F2742]/60">
            Fale conosco
          </p>
          <ul className="mt-4 space-y-2 text-sm font-medium text-[#64748B]">
            <li>{SITE.telefone}</li>
            <li className="break-all">{SITE.email}</li>
            <li>{SITE.endereco}</li>
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#A8CF00] px-4 py-2.5 text-xs font-bold text-white transition hover:brightness-105"
            >
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </a>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#69A9CF] bg-white px-4 py-2.5 text-xs font-bold text-[#0F2742] transition hover:bg-[#69A9CF]/10"
            >
              <LogIn className="h-4 w-4" />
              Login — área restrita
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-[#0F2742]/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-[#64748B] sm:flex-row sm:px-6 lg:px-8">
          <p>© 2026 Banho de Brilho. Todos os direitos reservados.</p>
          <p>Desenvolvido com orgulho em Belo Horizonte — MG ♥</p>
        </div>
      </div>
    </footer>
  );
}
