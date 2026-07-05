import { NextResponse } from "next/server";
import { getFolhaData } from "@/lib/folha";
import { folhaPdfBuffer } from "@/lib/pdf/folha-pdf";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agora = new Date();
  const mes = Number(url.searchParams.get("mes")) || agora.getMonth() + 1;
  const ano = Number(url.searchParams.get("ano")) || agora.getFullYear();

  if (mes < 1 || mes > 12 || ano < 2020 || ano > 2100)
    return NextResponse.json({ error: "Mês/ano inválido" }, { status: 400 });

  const data = await getFolhaData(mes, ano);
  const buffer = await folhaPdfBuffer(data);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="DIARIAS-${String(mes).padStart(2, "0")}-${ano}.pdf"`,
    },
  });
}
