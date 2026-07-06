import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import type { FolhaData } from "@/lib/folha";
import { BrandHeader } from "./BrandHeader";

// Identidade visual da marca (azul-escuro + verde-limão)
const PETROL = "#0F2742";
const GOLD = "#A8CF00";
const MUTED = "#6B7280";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111827",
    paddingTop: 32,
    paddingBottom: 50,
    paddingHorizontal: 36,
  },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 13, color: PETROL },
  brandSub: { fontSize: 7, color: MUTED, marginBottom: 6 },
  goldLine: { borderBottomWidth: 2, borderBottomColor: GOLD, marginBottom: 8 },
  titleBar: {
    backgroundColor: GOLD,
    color: PETROL,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 5,
    marginBottom: 6,
  },
  table: { borderWidth: 1, borderColor: PETROL },
  row: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#9CA3AF" },
  headRow: {
    flexDirection: "row",
    backgroundColor: PETROL,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: PETROL,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    borderTopWidth: 1,
    borderTopColor: PETROL,
  },
  cIt: { width: "6%", padding: 4, textAlign: "center", borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  cName: { width: "50%", padding: 4, borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  cNum: { width: "11%", padding: 4, textAlign: "center", borderRightWidth: 0.5, borderRightColor: "#9CA3AF" },
  cLast: { width: "11%", padding: 4, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 24,
    right: 24,
    borderTopWidth: 1,
    borderTopColor: PETROL,
    paddingTop: 4,
    fontSize: 6.5,
    color: MUTED,
    textAlign: "center",
  },
  zebra: { backgroundColor: "#F7F9FA" },
});

function FolhaDocument({ data }: { data: FolhaData }) {
  const t = data.totais;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <BrandHeader
          size={13}
          subtitle="Limpezas Especiais Ltda. — CNPJ 03.232.988/0001-02 — Belo Horizonte/MG"
        />
        <View style={styles.goldLine} />

        <Text style={styles.titleBar}>
          DIÁRIAS REFERENTE {data.mesLabel}
        </Text>

        <View style={styles.table}>
          <View style={styles.headRow}>
            <Text style={styles.cIt}>IT</Text>
            <Text style={styles.cName}>NOME</Text>
            <Text style={styles.cNum}>1ª QUINZENA</Text>
            <Text style={styles.cNum}>2ª QUINZENA</Text>
            <Text style={styles.cNum}>TOTAL DIÁRIAS</Text>
            <Text style={styles.cLast}>TOTAL HORAS</Text>
          </View>
          {data.linhas.map((l, i) => (
            <View key={l.it} style={[styles.row, ...(i % 2 ? [styles.zebra] : [])]}>
              <Text style={styles.cIt}>{l.it}</Text>
              <Text style={styles.cName}>{l.name}</Text>
              <Text style={styles.cNum}>{l.q1}</Text>
              <Text style={styles.cNum}>{l.q2}</Text>
              <Text style={styles.cNum}>{l.totalDiarias}</Text>
              <Text style={styles.cLast}>{l.totalHoras}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.cIt} />
            <Text style={styles.cName}>TOTAIS</Text>
            <Text style={styles.cNum}>{t.q1}</Text>
            <Text style={styles.cNum}>{t.q2}</Text>
            <Text style={styles.cNum}>{t.totalDiarias}</Text>
            <Text style={styles.cLast}>{t.totalHoras}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Banho de Brilho Limpezas Especiais Ltda. — Folha de diárias gerada
          pelo BB Manager em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
        </Text>
      </Page>
    </Document>
  );
}

export async function folhaPdfBuffer(data: FolhaData): Promise<Buffer> {
  return renderToBuffer(<FolhaDocument data={data} />);
}
