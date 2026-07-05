import { NextResponse } from "next/server";
import { getOsPdfData, osPdfBuffer } from "@/lib/pdf/os-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getOsPdfData(id);
  if (!data)
    return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  const buffer = await osPdfBuffer(data);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.code.replace("/", "-")}.pdf"`,
    },
  });
}
