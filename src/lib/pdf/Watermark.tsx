import fs from "node:fs";
import path from "node:path";
import { View, Image } from "@react-pdf/renderer";

// Logo oficial (PNG) para a marca d'água central das páginas.
let LOGO: string | null = null;
try {
  const p = path.join(
    process.cwd(),
    "public",
    "images",
    "logo-banho-de-brilho.png"
  );
  LOGO = `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
} catch {
  LOGO = null;
}

/**
 * Marca d'água: logo da Banho de Brilho centralizada e bem clara,
 * no fundo de todas as páginas (fica atrás do texto). Repete com `fixed`.
 */
export function Watermark() {
  if (!LOGO) return null;
  return (
    <View
      fixed
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* proporção real ~1,88:1; bem transparente para não atrapalhar a leitura */}
      <Image src={LOGO} style={{ width: 340, height: 181, opacity: 0.06 }} />
    </View>
  );
}
