"use client";

import { useState, useTransition } from "react";
import {
  FileText,
  Send,
  Loader2,
  X,
  Calculator,
  Clock,
  Wallet,
  Landmark,
  MinusCircle,
  BadgeDollarSign,
  Users,
} from "lucide-react";
import { sendFolhaContadorAction } from "@/lib/actions/send-folha";
import type { FolhaData } from "@/lib/folha";
import { formatMoney, cn } from "@/lib/utils";

/** Painel "DIÁRIAS REFERENTE AO MÊS" — folha enviada ao contador */
export function FolhaContador({ data }: { data: FolhaData }) {
  const [isPending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState(data.contadorEmail || "");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null
  );

  const t = data.totais;
  const encargos = t.ferias + t.terco + t.decimo + t.fgts;
  const comDiarias = data.linhas.filter((l) => l.totalDiarias > 0);

  function handleSend() {
    startTransition(async () => {
      const result = await sendFolhaContadorAction(data.mes, data.ano, email);
      if (result.ok) {
        setFeedback({
          ok: true,
          msg: `Folha de ${data.mesLabel} enviada para ${email}.`,
        });
        setSending(false);
      } else {
        setFeedback({ ok: false, msg: result.error ?? "Erro ao enviar." });
      }
    });
  }

  const cards = [
    {
      title: "Funcionários",
      value: `${comDiarias.length}`,
      hint: `com diárias no mês · ${data.linhas.length} ativos`,
      icon: Users,
    },
    {
      title: "Diárias no mês",
      value: `${t.totalDiarias}`,
      hint: `${t.q1} na 1ª quinzena · ${t.q2} na 2ª`,
      icon: Calculator,
    },
    {
      title: "Total de horas",
      value: `${t.totalHoras}h`,
      hint: `8h por diária · R$ ${data.valorHora.toFixed(2).replace(".", ",")}/hora`,
      icon: Clock,
    },
    {
      title: "Proventos",
      value: formatMoney(t.proventos),
      hint: "Horas × valor hora",
      icon: Wallet,
    },
    {
      title: "Encargos",
      value: formatMoney(encargos),
      hint: "Férias + 1/3 + 13º + FGTS",
      icon: Landmark,
    },
    {
      title: "Descontos INSS",
      value: formatMoney(data.ttDesc),
      hint: "INSS + INSS 13º",
      icon: MinusCircle,
    },
    {
      title: "Total líquido",
      value: formatMoney(t.liquido),
      hint: `Total bruto ${formatMoney(t.total)}`,
      icon: BadgeDollarSign,
    },
  ];

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Folha do contador — DIÁRIAS REFERENTE {data.mesLabel}
          </h2>
          <p className="text-xs text-ink-muted">
            Salário base R$ {data.salarioBase.toFixed(2).replace(".", ",")} · 8
            horas R$ {data.valor8Horas.toFixed(2).replace(".", ",")} · 1 hora R${" "}
            {data.valorHora.toFixed(2).replace(".", ",")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/diarias/folha?mes=${data.mes}&ano=${data.ano}`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-gray-50"
          >
            <FileText className="h-4 w-4" />
            Baixar PDF
          </a>
          <button
            onClick={() => {
              setFeedback(null);
              setSending(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-brand-petrol px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Send className="h-4 w-4" />
            Enviar para contador
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-2.5 text-sm",
            feedback.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-danger"
          )}
        >
          <span>{feedback.msg}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-ink-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 xl:grid-cols-7">
        {cards.map((c) => (
          <div
            key={c.title}
            className="rounded-lg border border-gray-100 bg-surface/60 p-3"
          >
            <div className="mb-1 flex items-center gap-1.5">
              <c.icon className="h-3.5 w-3.5 text-brand-teal" />
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                {c.title}
              </p>
            </div>
            <p className="text-lg font-bold text-ink">{c.value}</p>
            <p className="text-[11px] text-ink-muted">{c.hint}</p>
          </div>
        ))}
      </div>

      {comDiarias.length > 0 && (
        <div className="border-t border-gray-100 px-5 pb-5">
          <p className="py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Funcionários com diárias no mês
          </p>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-xs">
              <thead className="border-b border-gray-100 text-[10px] uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="py-2 pr-2 text-center">Nº</th>
                  <th className="py-2 pr-2">Nome</th>
                  <th className="py-2 pr-2 text-center">1ª Q.</th>
                  <th className="py-2 pr-2 text-center">2ª Q.</th>
                  <th className="py-2 pr-2 text-center">Diárias</th>
                  <th className="py-2 pr-2 text-center">Horas</th>
                  <th className="py-2 pr-2 text-right">Proventos</th>
                  <th className="py-2 pr-2 text-right">Férias 1/12</th>
                  <th className="py-2 pr-2 text-right">1/3 férias</th>
                  <th className="py-2 pr-2 text-right">13º 1/12</th>
                  <th className="py-2 pr-2 text-right">FGTS</th>
                  <th className="py-2 pr-2 text-right">INSS</th>
                  <th className="py-2 pr-2 text-right">INSS 13º</th>
                  <th className="py-2 pr-2 text-right">Total</th>
                  <th className="py-2 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {comDiarias.map((l, i) => (
                  <tr key={l.it}>
                    <td className="py-2 pr-2 text-center font-semibold text-ink-muted">
                      {i + 1}
                    </td>
                    <td className="py-2 pr-2 font-medium text-ink">{l.name}</td>
                    <td className="py-2 pr-2 text-center text-ink-muted">{l.q1}</td>
                    <td className="py-2 pr-2 text-center text-ink-muted">{l.q2}</td>
                    <td className="py-2 pr-2 text-center font-semibold text-ink">{l.totalDiarias}</td>
                    <td className="py-2 pr-2 text-center text-ink-muted">{l.totalHoras}h</td>
                    <td className="py-2 pr-2 text-right text-ink-muted">{formatMoney(l.proventos)}</td>
                    <td className="py-2 pr-2 text-right text-ink-muted">{formatMoney(l.ferias)}</td>
                    <td className="py-2 pr-2 text-right text-ink-muted">{formatMoney(l.terco)}</td>
                    <td className="py-2 pr-2 text-right text-ink-muted">{formatMoney(l.decimo)}</td>
                    <td className="py-2 pr-2 text-right text-ink-muted">{formatMoney(l.fgts)}</td>
                    <td className="py-2 pr-2 text-right text-danger">{formatMoney(l.inss)}</td>
                    <td className="py-2 pr-2 text-right text-danger">{formatMoney(l.inss13)}</td>
                    <td className="py-2 pr-2 text-right font-medium text-ink">{formatMoney(l.total)}</td>
                    <td className="py-2 text-right font-semibold text-success">{formatMoney(l.liquido)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 font-semibold text-ink">
                <tr>
                  <td className="py-2 pr-2 text-center">{comDiarias.length}</td>
                  <td className="py-2 pr-2">TOTAIS</td>
                  <td className="py-2 pr-2 text-center">{t.q1}</td>
                  <td className="py-2 pr-2 text-center">{t.q2}</td>
                  <td className="py-2 pr-2 text-center">{t.totalDiarias}</td>
                  <td className="py-2 pr-2 text-center">{t.totalHoras}h</td>
                  <td className="py-2 pr-2 text-right">{formatMoney(t.proventos)}</td>
                  <td className="py-2 pr-2 text-right">{formatMoney(t.ferias)}</td>
                  <td className="py-2 pr-2 text-right">{formatMoney(t.terco)}</td>
                  <td className="py-2 pr-2 text-right">{formatMoney(t.decimo)}</td>
                  <td className="py-2 pr-2 text-right">{formatMoney(t.fgts)}</td>
                  <td className="py-2 pr-2 text-right text-danger">{formatMoney(t.inss)}</td>
                  <td className="py-2 pr-2 text-right text-danger">{formatMoney(t.inss13)}</td>
                  <td className="py-2 pr-2 text-right">{formatMoney(t.total)}</td>
                  <td className="py-2 text-right text-success">{formatMoney(t.liquido)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">
            O PDF enviado ao contador leva apenas nome, quinzenas, total de
            diárias e horas de todos os {data.linhas.length} funcionários
            ativos — os valores acima são para controle interno.
          </p>
        </div>
      )}

      {sending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-petrol/10">
                <Send className="h-5 w-5 text-brand-petrol" />
              </span>
              <h3 className="text-base font-semibold text-ink">
                Enviar folha para o contador
              </h3>
            </div>
            <p className="mb-3 text-sm text-ink-muted">
              A folha DIÁRIAS REFERENTE {data.mesLabel} será enviada em PDF por
              e-mail. O endereço fica salvo para as próximas vezes.
            </p>
            {feedback && !feedback.ok && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {feedback.msg}
              </div>
            )}
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">
              E-mail do contador
            </label>
            <input
              type="email"
              required
              autoFocus
              className="input-base"
              placeholder="contador@exemplo.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setSending(false)}
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={isPending || !email}
                className="flex items-center gap-1.5 rounded-lg bg-brand-petrol px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
