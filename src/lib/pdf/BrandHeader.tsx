import fs from "node:fs";
import path from "node:path";
import { View, Text, Svg, Path, Image } from "@react-pdf/renderer";

const PETROL = "#0F2742";
const MUTED = "#64748B";
const AZUL = "#69A9CF";
const VERDE = "#A8CF00";

// Logo oficial (PNG). Se o arquivo não existir, cai no desenho vetorial.
let LOGO: string | null = null;
try {
  const p = path.join(
    process.cwd(),
    "public",
    "images",
    "logo-banho-de-brilho-header.png"
  );
  LOGO = `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
} catch {
  LOGO = null;
}

/**
 * Cabeçalho padrão dos PDFs: logo oficial + subtítulo,
 * com espaçamento correto entre as linhas.
 */
export function BrandHeader({
  size = 16,
  subtitle = "LIMPEZAS ESPECIAIS LTDA.",
}: {
  size?: number;
  subtitle?: string;
}) {
  if (LOGO) {
    const w = size * 9;
    const h = w / 2.73;
    return (
      <View style={{ marginBottom: 10 }}>
        {/* proporção real da logo recortada (~2,73:1), sem distorcer */}
        <Image src={LOGO} style={{ width: w, height: h }} />
        <Text
          style={{
            fontSize: Math.max(6.5, size * 0.5),
            color: MUTED,
            marginTop: 4,
          }}
        >
          {subtitle}
        </Text>
      </View>
    );
  }

  const logoH = size * 2.4;
  const logoW = (logoH * 62) / 84;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <Svg width={logoW} height={logoH} viewBox="0 0 62 84">
        <Path d="M22 4 A18 18 0 0 1 40 22 L22 22 Z" fill={AZUL} />
        <Path d="M20 24 L20 42 A18 18 0 0 1 2 24 Z" fill={AZUL} />
        <Path d="M22 44 A18 18 0 0 1 40 62 L22 62 Z" fill={VERDE} />
        <Path d="M20 64 L20 82 A18 18 0 0 1 2 64 Z" fill={VERDE} />
        <Path d="M42 24 A18 18 0 0 1 60 42 L42 42 Z" fill={AZUL} />
        <Path d="M42 44 L60 44 A18 18 0 0 1 42 62 Z" fill={VERDE} />
      </Svg>
      <View style={{ marginLeft: 8 }}>
        <Text
          style={{
            fontFamily: "Helvetica-Bold",
            fontSize: size,
            color: PETROL,
          }}
        >
          BANHO DE BRILHO
        </Text>
        <Text
          style={{
            fontSize: Math.max(6.5, size * 0.5),
            color: MUTED,
            marginTop: 3,
          }}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}
