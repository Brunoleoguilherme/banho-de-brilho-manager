import type { LocationRow } from "@/components/locations/LocationForm";

/** Converte a linha do banco (event_locations) para LocationRow tipado */
export function toLocationRow(r: Record<string, unknown>): LocationRow {
  const n = (v: unknown) => Number(v) || 0;
  const s = (v: unknown) => (v == null ? null : String(v));
  return {
    id: String(r.id),
    name: String(r.name),
    address: s(r.address),
    address_number: s(r.address_number),
    address_complement: s(r.address_complement),
    neighborhood: s(r.neighborhood),
    city: s(r.city),
    state: s(r.state),
    zip_code: s(r.zip_code),
    contact_name: s(r.contact_name),
    contact_phone: s(r.contact_phone),
    contact_email: s(r.contact_email),
    soap_type: s(r.soap_type),
    paper_towel_type: s(r.paper_towel_type),
    toilet_paper_type: s(r.toilet_paper_type),
    trash_bag: s(r.trash_bag),
    fem_cb: n(r.fem_cb), fem_ph: n(r.fem_ph), fem_pt: n(r.fem_pt), fem_sb: n(r.fem_sb),
    masc_cb: n(r.masc_cb), masc_ph: n(r.masc_ph), masc_pt: n(r.masc_pt), masc_sb: n(r.masc_sb),
    pne_cb: n(r.pne_cb), pne_ph: n(r.pne_ph), pne_pt: n(r.pne_pt), pne_sb: n(r.pne_sb),
    notes: s(r.notes),
  };
}
