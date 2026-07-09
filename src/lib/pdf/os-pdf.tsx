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
import { createClient } from "@/lib/supabase/server";
import { COMPANY } from "@/lib/constants";
import { BrandHeader } from "./BrandHeader";

// Identidade visual da marca (azul-escuro + verde-limão)
const PETROL = "#0F2742";
const GOLD = "#A8CF00";
const MUTED = "#64748B";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111827",
    paddingTop: 36,
    paddingBottom: 70,
    paddingHorizontal: 40,
    lineHeight: 1.4,
  },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 15, color: PETROL },
  brandSub: { fontSize: 8, color: MUTED, marginBottom: 10 },
  goldLine: { borderBottomWidth: 2, borderBottomColor: GOLD, marginBottom: 12 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 13, color: PETROL },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: PETROL,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#D1D5DB",
    paddingBottom: 2,
  },
  label: { fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#9CA3AF" },
  head: { fontFamily: "Helvetica-Bold", backgroundColor: "#EFF3F6" },
  shiftHeader: {
    backgroundColor: PETROL,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  cName: { width: "34%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  cSmall: { width: "13%", padding: 3, textAlign: "right", borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  cLast: { width: "14%", padding: 3 },
  table: { borderWidth: 1, borderColor: PETROL, marginBottom: 8 },
  listName: { width: "44%", padding: 4, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  listDoc: { width: "28%", padding: 4, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  listLast: { width: "28%", padding: 4 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: PETROL,
    paddingTop: 6,
    fontSize: 7.5,
    color: MUTED,
    textAlign: "center",
  },
});

// Estilo "planilha" (Relacao de Funcionarios/Veiculos) — cabecalhos coloridos
const planStyles = StyleSheet.create({
  block: { marginBottom: 14 },
  orange: {
    backgroundColor: "#F4B183",
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    padding: 5,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#9CA3AF",
  },
  green: {
    backgroundColor: "#C6E0B4",
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    padding: 3,
    color: "#111827",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#9CA3AF",
  },
  headRow: {
    flexDirection: "row",
    backgroundColor: "#A9D08E",
    fontFamily: "Helvetica-Bold",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#9CA3AF",
  },
  row: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#9CA3AF",
  },
  cIt: { width: "9%", padding: 3, textAlign: "center", borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  cNome: { width: "53%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  cRg: { width: "19%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  cCpf: { width: "19%", padding: 3 },
  vModel: { width: "45%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  vColor: { width: "23%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  vPlate: { width: "23%", padding: 3 },
});

const PHASE_LABELS: Record<string, string> = {
  montagem: "Montagem",
  realizacao: "Realização",
  desmontagem: "Desmontagem",
};

const ALLOC_STATUS: Record<string, string> = {
  convidado: "Convidado",
  confirmado: "Confirmado",
  recusou: "Recusou",
  substituido: "Substituído",
  compareceu: "Compareceu",
  faltou: "Faltou",
  pago: "Pago",
};

function d(date: string | null): string {
  if (!date) return "—";
  return format(parseISO(date), "dd/MM/yyyy");
}
function t(time: string | null): string {
  return time ? time.slice(0, 5) : "—";
}
function money(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface OsPdfData {
  code: string;
  status: string;
  clientName: string;
  eventName: string;
  location: string;
  period: string;
  proposalCode: string;
  proposalTotal: number;
  materials: string | null;
  transport: string | null;
  food: string | null;
  uniforms: string | null;
  notes: string | null;
  shifts: {
    phase: string;
    service_date: string;
    start_time: string | null;
    end_time: string | null;
    required_al: number;
    required_co: number;
    allocations: {
      name: string;
      cpf: string | null;
      rg: string | null;
      daily: number;
      vr: number;
      vt: number;
      total: number;
      status: string;
    }[];
  }[];
  checklist: { label: string; done: boolean }[];
  confirmedCollaborators: { name: string; cpf: string | null; rg: string | null }[];
  vehicles: {
    model: string;
    color: string | null;
    plate: string | null;
    driver_name: string | null;
    driver_document: string | null;
  }[];
}

export async function getOsPdfData(id: string): Promise<OsPdfData | null> {
  const supabase = await createClient();
  const [
    { data: os },
    { data: shifts },
    { data: allocations },
    { data: checklist },
    { data: vehicles },
  ] = await Promise.all([
      supabase
        .from("operation_orders")
        .select(
          "*, clients(name), events(name, location_name, city, state, start_date, end_date), proposals(code, total_amount)"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("operation_shifts")
        .select("*")
        .eq("operation_order_id", id)
        .order("service_date"),
      supabase
        .from("employee_allocations")
        .select("*, employees(full_name, document, rg)")
        .eq("operation_order_id", id),
      supabase
        .from("operation_checklist_items")
        .select("label, done")
        .eq("operation_order_id", id)
        .order("sort_order"),
      supabase
        .from("os_vehicles")
        .select("model, color, plate, driver_name, driver_document")
        .eq("operation_order_id", id)
        .order("created_at"),
    ]);

  if (!os) return null;

  const event = os.events as {
    name: string;
    location_name: string | null;
    city: string | null;
    state: string | null;
    start_date: string | null;
    end_date: string | null;
  } | null;
  const proposal = os.proposals as { code: string; total_amount: number } | null;

  const confirmedStatuses = ["confirmado", "compareceu", "pago"];
  const seen = new Set<string>();
  const confirmedCollaborators: OsPdfData["confirmedCollaborators"] = [];
  for (const a of allocations ?? []) {
    if (!confirmedStatuses.includes(a.status)) continue;
    const emp = a.employees as {
      full_name: string;
      document: string | null;
      rg: string | null;
    } | null;
    if (!emp || seen.has(a.employee_id)) continue;
    seen.add(a.employee_id);
    confirmedCollaborators.push({
      name: emp.full_name,
      cpf: emp.document,
      rg: emp.rg,
    });
  }
  confirmedCollaborators.sort((a, b) => a.name.localeCompare(b.name));

  return {
    code: os.code,
    status: os.status,
    clientName: (os.clients as { name: string } | null)?.name ?? "",
    eventName: event?.name ?? "",
    location: [
      event?.location_name,
      event?.city ? `${event.city}/${event.state ?? ""}` : null,
    ]
      .filter(Boolean)
      .join(" – "),
    period:
      event?.end_date && event.end_date !== event.start_date
        ? `${d(event?.start_date ?? null)} a ${d(event.end_date)}`
        : d(event?.start_date ?? null),
    proposalCode: proposal?.code ?? "",
    proposalTotal: Number(proposal?.total_amount) || 0,
    materials: os.materials_notes,
    transport: os.transport_notes,
    food: os.food_notes,
    uniforms: os.uniforms_notes,
    notes: os.notes,
    shifts: (shifts ?? []).map((s) => ({
      phase: s.phase,
      service_date: s.service_date,
      start_time: s.start_time,
      end_time: s.end_time,
      required_al: s.required_cleaning_agents ?? 0,
      required_co: s.required_coordinators ?? 0,
      allocations: (allocations ?? [])
        .filter((a) => a.operation_shift_id === s.id)
        .map((a) => {
          const emp = a.employees as {
            full_name: string;
            document: string | null;
            rg: string | null;
          } | null;
          return {
            name: emp?.full_name ?? "—",
            cpf: emp?.document ?? null,
            rg: emp?.rg ?? null,
            daily: Number(a.daily_rate) || 0,
            vr: Number(a.vr_amount) || 0,
            vt: Number(a.vt_amount) || 0,
            total: Number(a.total_amount) || 0,
            status: a.status,
          };
        })
        .sort((x, y) => x.name.localeCompare(y.name)),
    })),
    checklist: (checklist ?? []) as { label: string; done: boolean }[],
    confirmedCollaborators,
    vehicles: (vehicles ?? []) as OsPdfData["vehicles"],
  };
}

function Header({ title }: { title: string }) {
  return (
    <>
      <BrandHeader size={15} />
      <View style={styles.goldLine} />
      <Text style={[styles.title, { marginBottom: 10 }]}>{title}</Text>
    </>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {COMPANY.name} — CNPJ: {COMPANY.cnpj} — {COMPANY.address}
      </Text>
      <Text>
        Telefones: {COMPANY.phones} — E-mail: {COMPANY.email}
      </Text>
    </View>
  );
}

function OsDocument({ data }: { data: OsPdfData }) {
  return (
    <Document title={`${data.code}`} author={COMPANY.name}>
      <Page size="A4" style={styles.page}>
        <Header title={`ORDEM DE SERVIÇO ${data.code}`} />

        <View style={styles.section}>
          <Text>
            <Text style={styles.label}>Cliente: </Text>
            {data.clientName}
          </Text>
          <Text>
            <Text style={styles.label}>Evento: </Text>
            {data.eventName}
          </Text>
          <Text>
            <Text style={styles.label}>Local: </Text>
            {data.location || "—"}
          </Text>
          <Text>
            <Text style={styles.label}>Período: </Text>
            {data.period}
          </Text>
          <Text>
            <Text style={styles.label}>Proposta: </Text>
            {data.proposalCode} — {money(data.proposalTotal)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>TURNOS E ESCALA DE EQUIPE</Text>
        {data.shifts.map((s, i) => (
          <View key={i} style={styles.table} wrap={false}>
            <Text style={styles.shiftHeader}>
              {PHASE_LABELS[s.phase] ?? s.phase} — {d(s.service_date)} —{" "}
              {t(s.start_time)} às {t(s.end_time)} — previsto {s.required_al} AL
              + {s.required_co} CO
            </Text>
            <View style={[styles.row, styles.head]}>
              <Text style={styles.cName}>Funcionário</Text>
              <Text style={styles.cSmall}>Diária</Text>
              <Text style={styles.cSmall}>VR</Text>
              <Text style={styles.cSmall}>VT</Text>
              <Text style={styles.cSmall}>Total</Text>
              <Text style={styles.cLast}>Situação</Text>
            </View>
            {s.allocations.length === 0 ? (
              <View style={styles.row}>
                <Text style={{ padding: 3, color: MUTED }}>
                  Ninguém escalado neste turno ainda
                </Text>
              </View>
            ) : (
              s.allocations.map((a, j) => (
                <View key={j} style={styles.row}>
                  <Text style={styles.cName}>{a.name}</Text>
                  <Text style={styles.cSmall}>{money(a.daily)}</Text>
                  <Text style={styles.cSmall}>{money(a.vr)}</Text>
                  <Text style={styles.cSmall}>{money(a.vt)}</Text>
                  <Text style={styles.cSmall}>{money(a.total)}</Text>
                  <Text style={styles.cLast}>
                    {ALLOC_STATUS[a.status] ?? a.status}
                  </Text>
                </View>
              ))
            )}
          </View>
        ))}

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>CHECKLIST OPERACIONAL</Text>
          {data.checklist.map((c, i) => (
            <Text key={i}>
              {c.done ? "[X] " : "[  ] "}
              {c.label}
            </Text>
          ))}
        </View>

        {(data.materials || data.transport || data.food || data.uniforms || data.notes) && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>PLANEJAMENTO</Text>
            {data.materials && (
              <Text>
                <Text style={styles.label}>Materiais: </Text>
                {data.materials}
              </Text>
            )}
            {data.transport && (
              <Text>
                <Text style={styles.label}>Transporte: </Text>
                {data.transport}
              </Text>
            )}
            {data.food && (
              <Text>
                <Text style={styles.label}>Alimentação: </Text>
                {data.food}
              </Text>
            )}
            {data.uniforms && (
              <Text>
                <Text style={styles.label}>Uniformes: </Text>
                {data.uniforms}
              </Text>
            )}
            {data.notes && (
              <Text>
                <Text style={styles.label}>Observações: </Text>
                {data.notes}
              </Text>
            )}
          </View>
        )}

        <Footer />
      </Page>
    </Document>
  );
}

function CollaboratorsDocument({ data }: { data: OsPdfData }) {
  const ROSTER_EXCLUDE = ["recusou", "substituido", "faltou"];
  const local = (data.location || data.eventName || "LOCAL DO EVENTO").toUpperCase();
  const eventoData = (dateStr: string) =>
    format(parseISO(dateStr), "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR }).toUpperCase();

  return (
    <Document title={`Relacao ${data.code}`} author={COMPANY.name}>
      <Page size="A4" style={styles.page}>
        <BrandHeader size={15} />
        <View style={styles.goldLine} />

        {data.shifts.map((s, i) => {
          const roster = s.allocations.filter(
            (a) => !ROSTER_EXCLUDE.includes(a.status)
          );
          return (
            <View key={i} style={planStyles.block} wrap={false}>
              <Text style={planStyles.orange}>{local}</Text>
              <Text style={planStyles.green}>
                EVENTO: {data.eventName.toUpperCase()} — {eventoData(s.service_date)}
              </Text>
              <Text style={planStyles.green}>
                RELAÇÃO DE FUNCIONÁRIOS · LIMPEZA {t(s.start_time)} ÀS {t(s.end_time)}
              </Text>
              <View style={planStyles.headRow}>
                <Text style={planStyles.cIt}>IT</Text>
                <Text style={planStyles.cNome}>NOME</Text>
                <Text style={planStyles.cRg}>RG</Text>
                <Text style={planStyles.cCpf}>CPF</Text>
              </View>
              {roster.length === 0 ? (
                <View style={planStyles.row}>
                  <Text style={{ padding: 3, color: MUTED }}>
                    Ninguém escalado neste turno ainda
                  </Text>
                </View>
              ) : (
                roster.map((c, j) => (
                  <View key={j} style={planStyles.row}>
                    <Text style={planStyles.cIt}>{j + 1}</Text>
                    <Text style={planStyles.cNome}>{c.name}</Text>
                    <Text style={planStyles.cRg}>{c.rg ?? "—"}</Text>
                    <Text style={planStyles.cCpf}>{c.cpf ?? "—"}</Text>
                  </View>
                ))
              )}
            </View>
          );
        })}

        {data.vehicles.length > 0 && (
          <View style={planStyles.block} wrap={false}>
            <Text style={planStyles.orange}>{local}</Text>
            <Text style={planStyles.green}>RELAÇÃO DE VEÍCULOS</Text>
            <View style={planStyles.headRow}>
              <Text style={planStyles.cIt}>IT</Text>
              <Text style={planStyles.vModel}>MODELO</Text>
              <Text style={planStyles.vColor}>COR</Text>
              <Text style={planStyles.vPlate}>PLACA</Text>
            </View>
            {data.vehicles.map((v, i) => (
              <View key={i} style={planStyles.row}>
                <Text style={planStyles.cIt}>{i + 1}</Text>
                <Text style={planStyles.vModel}>{v.model}</Text>
                <Text style={planStyles.vColor}>{v.color ?? "—"}</Text>
                <Text style={planStyles.vPlate}>{v.plate ?? "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={{ color: MUTED, fontSize: 8, marginTop: 4 }}>
          Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
        </Text>

        <Footer />
      </Page>
    </Document>
  );
}

export async function osPdfBuffer(data: OsPdfData): Promise<Buffer> {
  return renderToBuffer(<OsDocument data={data} />);
}

export async function collaboratorsPdfBuffer(data: OsPdfData): Promise<Buffer> {
  return renderToBuffer(<CollaboratorsDocument data={data} />);
}
