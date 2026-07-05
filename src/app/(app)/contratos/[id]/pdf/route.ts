import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProposalPdfData } from "@/lib/pdf/proposal-data";
import { contractPdfBuffer } from "@/lib/pdf/contract-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, code, proposal_id")
    .eq("id", id)
    .single();

  if (!contract) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 }
    );
  }

  const data = await getProposalPdfData(contract.proposal_id);
  if (!data) {
    return NextResponse.json(
      { error: "Proposta do contrato não encontrada" },
      { status: 404 }
    );
  }

  const buffer = await contractPdfBuffer(data, contract.code);
  const filename = `${contract.code.replace("/", "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
