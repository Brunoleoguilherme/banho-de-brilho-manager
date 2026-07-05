import { NextResponse } from "next/server";
import { getProposalPdfData } from "@/lib/pdf/proposal-data";
import { proposalPdfBuffer } from "@/lib/pdf/proposal-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const data = await getProposalPdfData(id);
  if (!data) {
    return NextResponse.json(
      { error: "Proposta não encontrada" },
      { status: 404 }
    );
  }

  const buffer = await proposalPdfBuffer(data);
  const filename = `${data.code.replace("/", "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
