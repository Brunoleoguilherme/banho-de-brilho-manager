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
import { eventFullLocation, type ProposalPdfData } from "./proposal-data";

// Identidade visual da marca (azul-escuro)
const PETROL = "#0F2742";
const MUTED = "#64748B";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
    paddingTop: 40,
    paddingBottom: 90,
    paddingHorizontal: 48,
    lineHeight: 1.5,
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: PETROL,
    textAlign: "center",
    marginBottom: 4,
  },
  code: {
    fontSize: 10,
    color: MUTED,
    textAlign: "center",
    marginBottom: 18,
  },
  clause: { marginBottom: 10 },
  clauseTitle: {
    fontFamily: "Helvetica-Bold",
    color: PETROL,
    marginBottom: 3,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 4, marginBottom: 4, borderWidth: 1, borderColor: PETROL },
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
  tHead: { fontFamily: "Helvetica-Bold", backgroundColor: "#EFF3F6" },
  tCellDate: { width: "30%", padding: 4, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  tCellTime: { width: "40%", padding: 4, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  tCellNum: { width: "15%", padding: 4, textAlign: "center", borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  tCellNumLast: { width: "15%", padding: 4, textAlign: "center" },
  signatures: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBlock: { width: "45%", textAlign: "center" },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#111827",
    paddingTop: 4,
    fontSize: 9,
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

interface ContractPdfProps {
  data: ProposalPdfData;
  contractCode: string;
}

function ContractDocument({ data, contractCode }: ContractPdfProps) {
  const phases = ["montagem", "realizacao", "desmontagem"].filter((phase) =>
    data.schedule.some((s) => s.phase === phase)
  );

  const clientName = data.client?.legal_name || data.client?.name || "";
  const clientAddress = [
    [data.client?.address, data.client?.address_number]
      .filter(Boolean)
      .join(", "),
    data.client?.address_complement,
    data.client?.neighborhood,
    data.client?.city && `${data.client.city}/${data.client.state ?? ""}`,
    data.client?.zip_code && `CEP: ${data.client.zip_code}`,
  ]
    .filter(Boolean)
    .join(" – ");

  // Datas reais do evento a partir do cronograma (respeita dias avulsos):
  // consecutivos -> "no período de X a Y"; avulsos -> "nos dias 03 e 06 de ..."
  const uniqDates = Array.from(
    new Set((data.schedule ?? []).map((s) => s.service_date).filter(Boolean))
  ).sort();
  let eventDateLabel: string;
  if (uniqDates.length === 0) {
    eventDateLabel =
      data.event?.end_date && data.event.end_date !== data.event.start_date
        ? `no período de ${longDate(data.event.start_date)} a ${longDate(data.event.end_date)}`
        : `no dia ${longDate(data.event?.start_date ?? null)}`;
  } else if (uniqDates.length === 1) {
    eventDateLabel = `no dia ${longDate(uniqDates[0])}`;
  } else {
    const consecutivos = uniqDates.every(
      (d, i) =>
        i === 0 ||
        (parseISO(d).getTime() - parseISO(uniqDates[i - 1]).getTime()) /
          86400000 ===
          1
    );
    if (consecutivos) {
      eventDateLabel = `no período de ${longDate(uniqDates[0])} a ${longDate(
        uniqDates[uniqDates.length - 1]
      )}`;
    } else {
      const mesmoMes = uniqDates.every(
        (d) => d.slice(0, 7) === uniqDates[0].slice(0, 7)
      );
      if (mesmoMes) {
        const dias = uniqDates.map((d) => format(parseISO(d), "dd"));
        const sufixo = format(parseISO(uniqDates[0]), "'de' MMMM 'de' yyyy", {
          locale: ptBR,
        });
        eventDateLabel = `nos dias ${dias.slice(0, -1).join(", ")} e ${
          dias[dias.length - 1]
        } ${sufixo}`;
      } else {
        eventDateLabel = `nos dias ${uniqDates
          .map((d) => longDate(d))
          .join(" e ")}`;
      }
    }
  }

  return (
    <Document title={`Contrato ${contractCode}`} author={COMPANY.name}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          CONTRATO SIMPLIFICADO DE PRESTAÇÃO DE SERVIÇOS DE LIMPEZA
        </Text>
        <Text style={styles.code}>
          {contractCode} — referente à proposta {data.code}
        </Text>

        <View style={styles.clause}>
          <Text style={styles.clauseTitle}>1. PARTES</Text>
          <Text>
            <Text style={styles.bold}>CONTRATADA: </Text>
            {COMPANY.name}, CNPJ {COMPANY.cnpj}, com sede na {COMPANY.address},
            CEP {COMPANY.zip}, telefones {COMPANY.phones}, e-mail{" "}
            {COMPANY.email}.
          </Text>
          <Text style={{ marginTop: 4 }}>
            <Text style={styles.bold}>CONTRATANTE: </Text>
            {clientName}
            {data.client?.document ? `, CNPJ/CPF ${data.client.document}` : ""}
            {clientAddress ? `, ${clientAddress}` : ""}
            {data.contact_name ? `, representada por ${data.contact_name}` : ""}.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text style={styles.clauseTitle}>2. OBJETO DO CONTRATO</Text>
          <Text>
            Prestação de serviços de limpeza pela CONTRATADA durante o evento{" "}
            <Text style={styles.bold}>{data.event?.name ?? ""}</Text>, a ser
            realizado em {eventFullLocation(data.event)},{" "}
            {eventDateLabel}, conforme demanda de funcionários e cronograma
            descritos na cláusula 3.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text style={styles.clauseTitle}>3. CRONOGRAMA DE FUNCIONÁRIOS</Text>
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
                  <View key={i} style={styles.tRow}>
                    <Text style={styles.tCellDate}>{shortDate(s.service_date)}</Text>
                    <Text style={styles.tCellTime}>
                      {timeRange(s.start_time, s.end_time)}
                    </Text>
                    <Text style={styles.tCellNum}>
                      {String(s.cleaning_agents).padStart(2, "0")}
                    </Text>
                    <Text style={styles.tCellNumLast}>
                      {String(s.coordinators).padStart(2, "0")}
                    </Text>
                  </View>
                ))}
            </View>
          ))}
          <Text style={{ fontSize: 8, color: MUTED }}>
            ** AL = Agente de Limpeza ** CO = Coordenador de Limpeza
          </Text>
        </View>

        <View style={styles.clause}>
          <Text style={styles.clauseTitle}>
            4. RESPONSABILIDADES DA CONTRATADA
          </Text>
          <Text>
            {data.responsibilities_company ||
              "Funcionários devidamente uniformizados, transporte, refeições, encargos trabalhistas e fiscais."}
          </Text>
        </View>

        <View style={styles.clause}>
          <Text style={styles.clauseTitle}>
            5. RESPONSABILIDADES DO CONTRATANTE/LOCAL
          </Text>
          <Text>
            {data.responsibilities_client ||
              "Fornecer acesso ao local nos horários acordados e as condições necessárias à execução dos serviços."}
          </Text>
        </View>

        <View style={styles.clause}>
          <Text style={styles.clauseTitle}>
            6. PREÇO E CONDIÇÕES DE PAGAMENTO
          </Text>
          <Text>
            Pela prestação dos serviços, o CONTRATANTE pagará à CONTRATADA o
            valor de <Text style={styles.bold}>{money(data.total_amount)}</Text>
            {data.amount_in_words ? ` (${data.amount_in_words})` : ""}
            {data.payment_terms ? `, ${data.payment_terms.toLowerCase()}` : ""}.
          </Text>
        </View>

        <View style={styles.clause}>
          <Text style={styles.clauseTitle}>7. FORO</Text>
          <Text>
            Fica eleito o foro da comarca de Belo Horizonte/MG para dirimir
            quaisquer dúvidas oriundas do presente contrato.
          </Text>
        </View>

        <Text style={{ marginTop: 12 }}>
          Belo Horizonte, {longDate(data.issue_date)}.
        </Text>

        <View style={styles.signatures} wrap={false}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLine}>
              {COMPANY.name}{"\n"}CONTRATADA
            </Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLine}>
              {clientName}{"\n"}CONTRATANTE
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>
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

export async function contractPdfBuffer(
  data: ProposalPdfData,
  contractCode: string
): Promise<Buffer> {
  return renderToBuffer(
    <ContractDocument data={data} contractCode={contractCode} />
  );
}
