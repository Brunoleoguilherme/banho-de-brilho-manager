import { View, Text, Svg, Path } from "@react-pdf/renderer";

const PETROL = "#0F2742";
const MUTED = "#64748B";
const AZUL = "#69A9CF";
const VERDE = "#A8CF00";

/**
 * Cabeçalho padrão dos PDFs: logo (folhas) + BANHO DE BRILHO + subtítulo,
 * com espaçamento correto entre as linhas.
 */
export function BrandHeader({
  size = 16,
  subtitle = "LIMPEZAS ESPECIAIS LTDA.",
}: {
  size?: number;
  subtitle?: string;
}) {
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
