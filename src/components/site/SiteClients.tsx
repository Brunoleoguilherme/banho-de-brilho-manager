"use client";

import { useState } from "react";

const CLIENTES = [
  { nome: "Fundação Torino", arquivo: "fundacao-torino.png" },
  { nome: "Fiat", arquivo: "fiat.png" },
  { nome: "Estado de Minas", arquivo: "estado-de-minas.png" },
  { nome: "Chevrolet Hall", arquivo: "chevrolet-hall.png" },
  { nome: "CEMIG", arquivo: "cemig.png" },
  { nome: "Abril", arquivo: "abril.png" },
  { nome: "Vale", arquivo: "vale.png" },
  { nome: "Unimed", arquivo: "unimed.png" },
  { nome: "SESC Minas Gerais", arquivo: "sesc.png" },
  { nome: "Ricardo Eletro", arquivo: "ricardo-eletro.png" },
  { nome: "Governo de Minas", arquivo: "governo-de-minas.png" },
  { nome: "Fundação Fiat", arquivo: "fundacao-fiat.png" },
];

function LogoCliente({ nome, arquivo }: { nome: string; arquivo: string }) {
  const [erro, setErro] = useState(false);
  return (
    <div className="flex h-24 items-center justify-center rounded-2xl border border-slate-100 bg-white px-6 shadow-card transition hover:shadow-lg">
      {erro ? (
        <span className="text-center text-sm font-bold text-[#0F2742]/70">
          {nome}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/clientes/${arquivo}`}
          alt={nome}
          className="max-h-14 w-auto object-contain"
          onError={() => setErro(true)}
        />
      )}
    </div>
  );
}

export function SiteClients() {
  return (
    <section id="clientes" className="bg-[#F5F7FA] py-16 lg:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8CF00]">
          Quem confia no nosso trabalho
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#0F2742] sm:text-3xl">
          Clientes que são nossa maior referência
        </h2>
        <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[#A8CF00]" />

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CLIENTES.map((c) => (
            <LogoCliente key={c.nome} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
}
