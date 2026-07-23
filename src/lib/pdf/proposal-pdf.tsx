import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { COMPANY } from "@/lib/constants";
import { BrandHeader } from "./BrandHeader";
import { eventFullLocation, type ProposalPdfData } from "./proposal-data";

// Identidade visual da marca (azul-escuro + verde-limão)
const PETROL = "#0F2742";
const GOLD = "#A8CF00";
const MUTED = "#64748B";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
    paddingTop: 128,
    paddingBottom: 90,
    paddingHorizontal: 48,
    lineHeight: 1.45,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  proposalCode: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: PETROL,
  },
  brand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: PETROL,
    marginBottom: 2,
  },
  brandSub: { fontSize: 8, color: MUTED, marginBottom: 14 },
  goldLine: {
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    marginBottom: 16,
  },
  pageHeader: {
    position: "absolute",
    top: 40,
    left: 48,
    right: 48,
  },
  section: { marginBottom: 12 },
  label: { fontFamily: "Helvetica-Bold" },
  clientBlock: { marginBottom: 14 },
  table: {
    marginTop: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: PETROL,
  },
  phaseHeader: {
    backgroundColor: PETROL,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    paddingVertical: 3,
    paddingHorizontal: 6,
    textTransform: "uppercase",
  },
  tRow: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#9CA3AF" },
  tHead: {
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#EFF3F6",
  },
  tCellDate: { width: "30%", padding: 4, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  tCellTime: { width: "40%", padding: 4, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  tCellNum: { width: "15%", padding: 4, textAlign: "center", borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  tCellNumLast: { width: "15%", padding: 4, textAlign: "center" },
  tCellDescRow: {
    width: "100%",
    paddingHorizontal: 6,
    paddingBottom: 4,
    fontFamily: "Helvetica-Oblique",
    color: MUTED,
  },
  // Locação / Equipamentos
  rCellDesc: { width: "55%", padding: 4, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  rCellQty: { width: "12%", padding: 4, textAlign: "center", borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  rCellUnit: { width: "16%", padding: 4, textAlign: "right", borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  rCellTotal: { width: "17%", padding: 4, textAlign: "right" },
  // Valores discriminados
  valLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 2,
  },
  valLabel: { flex: 1, paddingRight: 12 },
  valAmount: { width: 90, textAlign: "right" },
  legend: {
    fontSize: 8,
    color: PETROL,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  respTitle: {
    fontFamily: "Helvetica-Bold",
    color: PETROL,
    marginBottom: 2,
    fontSize: 10,
  },
  valueBox: {
    marginTop: 6,
    marginBottom: 16,
    padding: 10,
    backgroundColor: "#F5F7FA",
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: PETROL,
    paddingTop: 8,
    fontSize: 8,
    color: PETROL,
    textAlign: "center",
  },
});

const PHASE_LABELS: Record<string, string> = {
  continuo: "Turno contínuo",
  montagem: "Montagem",
  realizacao: "Realização",
  desmontagem: "Desmontagem",
};

function longDate(date: string | null): string {
  if (!date) return "";
  return format(parseISO(date), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function shortDate(date: string | null): string {
  if (!date) return "—";
  return format(parseISO(date), "dd/MM/yyyy");
}

function timeRange(start: string | null, end: string | null): string {
  if (!start) return "—";
  const s = start.slice(0, 5);
  const e = end ? end.slice(0, 5) : "";
  return e ? `${s} às ${e}` : s;
}

function money(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProposalDocument({ data }: { data: ProposalPdfData }) {
  const phases = ["continuo", "montagem", "realizacao", "desmontagem"].filter((phase) =>
    data.schedule.some((s) => s.phase === phase)
  );

  // Valores discriminados que têm descrição — linhas sem rótulo só compõem o
  // total (que aparece no box de pagamento), sem virar linha no PDF.
  const labeledValues = data.value_items.filter(
    (v) => (v.label ?? "").trim() !== ""
  );

  // Dias reais de realização (do cronograma) — respeita dias avulsos.
  // Se não houver linhas de "realização", usa todos os dias do cronograma.
  type DatedRow = (typeof data.schedule)[number] & { service_date: string };
  const datedRows = data.schedule.filter(
    (s): s is DatedRow => !!s.service_date
  );
  const realizacaoRows = datedRows.filter((s) => s.phase === "realizacao");
  const baseRows = realizacaoRows.length > 0 ? realizacaoRows : datedRows;
  const realDays = [...baseRows].sort((a, b) =>
    a.service_date > b.service_date ? 1 : -1
  );
  const uniqDates = Array.from(new Set(realDays.map((s) => s.service_date)));

  const consecutivos =
    uniqDates.length > 1 &&
    uniqDates.every(
      (d, i) =>
        i === 0 ||
        (parseISO(d).getTime() - parseISO(uniqDates[i - 1]).getTime()) /
          86400000 ===
          1
    );

  let eventDateLabel: string;
  if (uniqDates.length === 0) {
    // Sem cronograma de realização: usa as datas do evento
    eventDateLabel =
      data.event?.end_date && data.event.end_date !== data.event.start_date
        ? `${longDate(data.event.start_date)} a ${longDate(data.event.end_date)}`
        : longDate(data.event?.start_date ?? null);
  } else if (uniqDates.length === 1) {
    eventDateLabel = longDate(uniqDates[0]);
  } else if (consecutivos) {
    eventDateLabel = `${longDate(uniqDates[0])} a ${longDate(uniqDates[uniqDates.length - 1])}`;
  } else {
    // Dias avulsos: "03 e 06 de julho de 2026" (mesmo mês) ou lista completa
    const mesmoMes = uniqDates.every(
      (d) => d.slice(0, 7) === uniqDates[0].slice(0, 7)
    );
    if (mesmoMes) {
      const dias = uniqDates.map((d) => format(parseISO(d), "dd"));
      const sufixo = format(parseISO(uniqDates[0]), "'de' MMMM 'de' yyyy", {
        locale: ptBR,
      });
      eventDateLabel = `${dias.slice(0, -1).join(", ")} e ${dias[dias.length - 1]} ${sufixo}`;
    } else {
      eventDateLabel = uniqDates.map((d) => longDate(d)).join(" e ");
    }
  }

  return (
    <Document title={`Proposta ${data.code}`} author={COMPANY.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader} fixed>
          <BrandHeader size={16} subtitle="" />
          <View style={styles.goldLine} />
        </View>

        <View style={styles.headerRow}>
          <Text>Belo Horizonte, {longDate(data.issue_date)}</Text>
          <Text style={styles.proposalCode}>PROPOSTA {data.code}</Text>
        </View>

        <View style={styles.clientBlock}>
          <Text style={styles.label}>A</Text>
          <Text style={styles.label}>{data.client?.name?.toUpperCase()}</Text>
          {data.contact_name ? <Text>A/c: {data.contact_name}</Text> : null}
          {data.contact_email || data.client?.email ? (
            <Text>E-mail: {data.contact_email || data.client?.email}</Text>
          ) : null}
          {data.contact_phone || data.client?.phone ? (
            <Text>Fone: {data.contact_phone || data.client?.phone}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text>
            <Text style={styles.label}>Evento: </Text>
            {data.event?.name ?? ""}
          </Text>
          <Text>
            <Text style={styles.label}>Local: </Text>
            {eventFullLocation(data.event)}
          </Text>
          <Text>
            <Text style={styles.label}>Data da realização: </Text>
            {eventDateLabel}
          </Text>
          {data.event?.estimated_public ? (
            <Text>
              <Text style={styles.label}>Público estimado: </Text>
              {data.event.estimated_public.toLocaleString("pt-BR")}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text>Prezados(as) Senhores(as),</Text>
          <Text style={{ marginTop: 6 }}>
            {phases.length > 0
              ? `Conforme solicitação, segue proposta da ${COMPANY.name} para serviços de limpeza durante o evento acima descrito, a ser realizado de acordo com a seguinte demanda de funcionários e cronograma:`
              : `Conforme solicitação, segue proposta da ${COMPANY.name} para o evento acima descrito, conforme discriminado abaixo:`}
          </Text>
        </View>

        {phases.map((phase) => (
          <View key={phase} style={styles.table} wrap={false}>
            <Text style={styles.phaseHeader}>{PHASE_LABELS[phase]}</Text>
            <View style={[styles.tRow, styles.tHead]}>
              <Text style={styles.tCellDate}>Data</Text>
              <Text style={styles.tCellTime}>Horário</Text>
              <Text style={styles.tCellNum}>AL</Text>
              <Text style={styles.tCellNumLast}>CO</Text>
            </View>
            {data.schedule
              .filter((s) => s.phase === phase)
              .map((s, i) => (
                <View key={i}>
                  <View style={styles.tRow}>
                    <Text style={styles.tCellDate}>
                      {s.date_tbd ? "A definir" : shortDate(s.service_date)}
                    </Text>
                    <Text style={styles.tCellTime}>
                      {s.time_label
                        ? s.time_label
                        : timeRange(s.start_time, s.end_time)}
                    </Text>
                    <Text style={styles.tCellNum}>
                      {String(s.cleaning_agents).padStart(2, "0")}
                    </Text>
                    <Text style={styles.tCellNumLast}>
                      {String(s.coordinators).padStart(2, "0")}
                    </Text>
                  </View>
                  {s.notes ? (
                    <View style={styles.tRow}>
                      <Text style={styles.tCellDescRow}>{s.notes}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
          </View>
        ))}

        {phases.length > 0 ? (
          <Text style={styles.legend}>
            ** AL = Agente de Limpeza&nbsp;&nbsp;&nbsp;** CO = Coordenador de
            Limpeza
          </Text>
        ) : null}

        {data.rental_items.length > 0 ? (
          <View style={styles.table} wrap={false}>
            <Text style={styles.phaseHeader}>Locação / Equipamentos</Text>
            <View style={[styles.tRow, styles.tHead]}>
              <Text style={styles.rCellDesc}>Descrição</Text>
              <Text style={styles.rCellQty}>Qtd.</Text>
              <Text style={styles.rCellUnit}>Valor unit.</Text>
              <Text style={styles.rCellTotal}>Total</Text>
            </View>
            {data.rental_items.map((r, i) => (
              <View key={i} style={styles.tRow}>
                <Text style={styles.rCellDesc}>{r.description}</Text>
                <Text style={styles.rCellQty}>
                  {String(r.quantity).replace(".", ",")}
                </Text>
                <Text style={styles.rCellUnit}>{money(r.unit_value)}</Text>
                <Text style={styles.rCellTotal}>
                  {money(r.quantity * r.unit_value)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {data.responsibilities_company ? (
          <View style={styles.section}>
            <Text style={styles.respTitle}>NOSSA RESPONSABILIDADE:</Text>
            <Text>{data.responsibilities_company}</Text>
          </View>
        ) : null}

        {data.responsibilities_client ? (
          <View style={styles.section}>
            <Text style={styles.respTitle}>
              RESPONSABILIDADE DO CONTRATANTE/LOCAL:
            </Text>
            <Text>{data.responsibilities_client}</Text>
          </View>
        ) : null}

        {/* Valor/forma de pagamento + encerramento ficam sempre juntos:
            se não couber na página, o bloco inteiro desce para a próxima. */}
        <View wrap={false}>
        {labeledValues.length > 0 ? (
          <View style={{ marginBottom: 8 }}>
            {labeledValues.map((v, i) => (
              <View key={i} style={styles.valLine}>
                <Text style={styles.valLabel}>{v.label}</Text>
                {/* Mostra o valor por linha só quando há mais de uma descrição
                    (quebra real). Com uma linha só, o valor apareceria repetido
                    no box de pagamento abaixo, então exibimos só a descrição. */}
                {labeledValues.length > 1 ? (
                  <Text style={styles.valAmount}>{money(v.amount)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.valueBox} wrap={false}>
          <Text>
            <Text style={styles.label}>Valor e forma de pagamento: </Text>
            {money(data.total_amount)}
            {data.amount_in_words ? ` (${data.amount_in_words})` : ""}
            {data.payment_terms ? `, ${data.payment_terms.toLowerCase()}` : ""}
            {` e pagamento através de depósito junto ao ${COMPANY.bank.name} — Agência: ${COMPANY.bank.agency} — Conta corrente: ${COMPANY.bank.account} — PIX (${COMPANY.bank.pixKind}): ${COMPANY.bank.pix}.`}
          </Text>
          {data.valid_until ? (
            <Text style={{ marginTop: 4 }}>
              <Text style={styles.label}>Validade da proposta: </Text>
              {longDate(data.valid_until)}.
            </Text>
          ) : null}
        </View>

        <View style={{ marginTop: 10 }}>
          <Text>Atenciosamente,</Text>
          <Text style={[styles.label, { marginTop: 16 }]}>
            Iracema Martins e Cláudio Guilherme
          </Text>
        </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.label}>
            {COMPANY.name} — CNPJ: {COMPANY.cnpj}
          </Text>
          <Text>
            {COMPANY.address} — CEP: {COMPANY.zip}
          </Text>
          <Text>
            Telefones: {COMPANY.phones} — E-mail: {COMPANY.email}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function proposalPdfBuffer(data: ProposalPdfData): Promise<Buffer> {
  return renderToBuffer(<ProposalDocument data={data} />);
}
