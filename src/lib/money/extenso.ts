/**
 * Converte valores em reais para texto por extenso.
 * Ex.: 4131.00 → "Quatro mil e cento e trinta e um reais"
 *      286.20  → "Duzentos e oitenta e seis reais e vinte centavos"
 */

const UNIDADES = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis",
  "dezessete", "dezoito", "dezenove",
];

const DEZENAS = [
  "", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta",
  "oitenta", "noventa",
];

const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

function ateNovecentos(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";

  const partes: string[] = [];
  const c = Math.floor(n / 100);
  const resto = n % 100;

  if (c > 0) partes.push(CENTENAS[c]);

  if (resto > 0) {
    if (resto < 20) {
      partes.push(UNIDADES[resto]);
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }

  return partes.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";

  const partes: string[] = [];

  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const centenas = n % 1000;

  if (milhoes > 0) {
    partes.push(
      milhoes === 1 ? "um milhão" : `${ateNovecentos(milhoes)} milhões`
    );
  }
  if (milhares > 0) {
    partes.push(milhares === 1 ? "mil" : `${ateNovecentos(milhares)} mil`);
  }
  if (centenas > 0) {
    partes.push(ateNovecentos(centenas));
  }

  return partes.join(" e ");
}

export function valorPorExtenso(valor: number): string {
  if (!isFinite(valor) || valor < 0) return "";

  const centavosTotais = Math.round(valor * 100);
  const inteiro = Math.floor(centavosTotais / 100);
  const centavos = centavosTotais % 100;

  const partes: string[] = [];

  if (inteiro > 0) {
    let texto = inteiroPorExtenso(inteiro);
    // "um milhão de reais" / "dois milhões de reais"
    if (inteiro % 1_000_000 === 0) texto += " de";
    partes.push(`${texto} ${inteiro === 1 ? "real" : "reais"}`);
  }

  if (centavos > 0) {
    partes.push(
      `${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`
    );
  }

  if (partes.length === 0) return "zero reais";

  const resultado = partes.join(" e ");
  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
}
