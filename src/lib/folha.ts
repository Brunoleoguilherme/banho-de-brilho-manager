import { createClient } from "@/lib/supabase/server";

/**
 * Folha do contador — "DIÁRIAS REFERENTE AO MÊS"
 * Replica a planilha enviada ao contador: por funcionário, diárias por
 * quinzena, horas (8h por diária), proventos e encargos/descontos.
 */

// Percentuais fixos da planilha (sobre os proventos)
export const FOLHA_PCT = {
  ferias: 8.3333, // Férias 1/12
  terco: 2.777, // 1/3 de férias
  decimo: 8.3333, // 13º salário 1/12
  fgts: 9.56, // FGTS (custo, não entra no total)
  inss: 8.3333, // Desconto INSS
  inss13: 0.624, // Desconto INSS 13º
};

export const MESES = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

export interface FolhaLinha {
  it: number;
  name: string;
  q1: number;
  q2: number;
  totalDiarias: number;
  totalHoras: number;
  proventos: number;
  dsr: number;
  ferias: number;
  terco: number;
  decimo: number;
  fgts: number;
  inss: number;
  inss13: number;
  total: number;
  liquido: number;
}

export interface FolhaData {
  mes: number; // 1-12
  ano: number;
  mesLabel: string; // "JULHO DE 2026"
  salarioBase: number;
  valorHora: number;
  valor8Horas: number;
  contadorEmail: string;
  linhas: FolhaLinha[];
  totais: Omit<FolhaLinha, "it" | "name">;
  ttDesc: number; // INSS + INSS 13º
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function getFolhaData(
  mes: number,
  ano: number
): Promise<FolhaData> {
  const supabase = await createClient();

  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const fimDate = new Date(ano, mes, 0); // último dia do mês
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(fimDate.getDate()).padStart(2, "0")}`;

  const [{ data: settings }, { data: employees }, { data: allocations }] =
    await Promise.all([
      supabase
        .from("app_settings")
        .select("key, value, text_value")
        .in("key", ["folha_salario_base", "folha_valor_hora", "contador_email"]),
      supabase
        .from("employees")
        .select("id, full_name")
        .eq("status", "ativo")
        .neq("employee_type", "freelancer")
        .order("full_name"),
      supabase
        .from("employee_allocations")
        .select("employee_id, status, operation_shifts!inner(service_date)")
        .gte("operation_shifts.service_date", inicio)
        .lte("operation_shifts.service_date", fim),
    ]);

  const setting = (key: string, fallback: number) =>
    Number(settings?.find((s) => s.key === key)?.value ?? fallback);
  const salarioBase = setting("folha_salario_base", 1772.8);
  const valorHora = setting("folha_valor_hora", 8.49);
  const contadorEmail =
    settings?.find((s) => s.key === "contador_email")?.text_value ?? "";

  // Conta diárias trabalhadas por funcionário e quinzena
  const porFuncionario = new Map<string, { q1: number; q2: number }>();
  for (const a of allocations ?? []) {
    if (!["confirmado", "compareceu", "pago"].includes(a.status)) continue;
    const shift = a.operation_shifts as unknown as { service_date: string };
    if (!shift?.service_date) continue;
    const dia = Number(shift.service_date.slice(8, 10));
    const atual = porFuncionario.get(a.employee_id) ?? { q1: 0, q2: 0 };
    if (dia <= 15) atual.q1 += 1;
    else atual.q2 += 1;
    porFuncionario.set(a.employee_id, atual);
  }

  const linhas: FolhaLinha[] = (employees ?? []).map((emp, i) => {
    const { q1, q2 } = porFuncionario.get(emp.id) ?? { q1: 0, q2: 0 };
    const totalDiarias = q1 + q2;
    const totalHoras = totalDiarias * 8;
    const proventos = r2(totalHoras * valorHora);
    const dsr = 0;
    const ferias = r2(proventos * (FOLHA_PCT.ferias / 100));
    const terco = r2(proventos * (FOLHA_PCT.terco / 100));
    const decimo = r2(proventos * (FOLHA_PCT.decimo / 100));
    const fgts = r2(proventos * (FOLHA_PCT.fgts / 100));
    const inss = r2(proventos * (FOLHA_PCT.inss / 100));
    const inss13 = r2(proventos * (FOLHA_PCT.inss13 / 100));
    const total = r2(proventos + dsr + ferias + terco + decimo);
    const liquido = r2(total - inss - inss13);
    return {
      it: i + 1,
      name: emp.full_name.toUpperCase(),
      q1, q2, totalDiarias, totalHoras,
      proventos, dsr, ferias, terco, decimo, fgts, inss, inss13,
      total, liquido,
    };
  });

  const totais = linhas.reduce(
    (acc, l) => ({
      q1: acc.q1 + l.q1,
      q2: acc.q2 + l.q2,
      totalDiarias: acc.totalDiarias + l.totalDiarias,
      totalHoras: acc.totalHoras + l.totalHoras,
      proventos: r2(acc.proventos + l.proventos),
      dsr: r2(acc.dsr + l.dsr),
      ferias: r2(acc.ferias + l.ferias),
      terco: r2(acc.terco + l.terco),
      decimo: r2(acc.decimo + l.decimo),
      fgts: r2(acc.fgts + l.fgts),
      inss: r2(acc.inss + l.inss),
      inss13: r2(acc.inss13 + l.inss13),
      total: r2(acc.total + l.total),
      liquido: r2(acc.liquido + l.liquido),
    }),
    {
      q1: 0, q2: 0, totalDiarias: 0, totalHoras: 0,
      proventos: 0, dsr: 0, ferias: 0, terco: 0, decimo: 0,
      fgts: 0, inss: 0, inss13: 0, total: 0, liquido: 0,
    }
  );

  return {
    mes,
    ano,
    mesLabel: `${MESES[mes - 1]} DE ${ano}`,
    salarioBase,
    valorHora,
    valor8Horas: r2(valorHora * 8),
    contadorEmail,
    linhas,
    totais,
    ttDesc: r2(totais.inss + totais.inss13),
  };
}
