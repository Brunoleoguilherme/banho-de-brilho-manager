import { NextResponse } from "next/server";
import { getOsPdfData, collaboratorsPdfBuffer } from "@/lib/pdf/os-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getOsPdfData(id);
  if (!data)
    return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  const buffer = await collaboratorsPdfBuffer(data);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="colaboradores-${data.code.replace("/", "-")}.pdf"`,
    },
  });
}
