import "server-only";

export type BulkRow = {
  row_no: number;
  name: string;
  phone: string;
  city: string;
  country: string;
  weight: number | null;
  description: string;
  value: number | null;
  ok: boolean;
  error: string | null;
};

/**
 * Parseert geplakte CSV-regels voor de zakelijke bulk-upload.
 * Kolommen (met ; of , gescheiden): naam;telefoon;plaats;land;gewicht_kg;omschrijving;waarde_eur
 * Regels die met # beginnen of leeg zijn worden overgeslagen.
 */
export function parseBulkCsv(text: string): BulkRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const rows: BulkRow[] = [];
  let n = 0;
  for (const line of lines) {
    n++;
    const cols = line.split(/[;,\t]/).map((c) => c.trim());
    const [name = "", phone = "", city = "", country = "", weightRaw = "", description = "", valueRaw = ""] = cols;
    const weight = weightRaw ? parseFloat(weightRaw.replace(",", ".")) : null;
    const value = valueRaw ? parseFloat(valueRaw.replace(",", ".")) : null;

    let error: string | null = null;
    if (!name) error = "naam ontbreekt";
    else if (cols.length < 5) error = "te weinig kolommen";
    else if (weight == null || !Number.isFinite(weight) || weight <= 0) error = "ongeldig gewicht";
    else if (value != null && (!Number.isFinite(value) || value < 0)) error = "ongeldige waarde";

    rows.push({
      row_no: n, name, phone, city, country: country || "SR",
      weight: Number.isFinite(weight as number) ? weight : null,
      description: description || "Diverse artikelen",
      value: Number.isFinite(value as number) ? value : null,
      ok: error == null, error,
    });
  }
  return rows;
}
