import * as XLSX from 'xlsx';

export interface ImportRow {
  phone: string;
  name: string;
}

/** A parsed sheet cell — xlsx yields primitives (or a Date with cellDates). */
type CellValue = string | number | boolean | Date | null | undefined;

/** Parse an uploaded .xlsx/.csv (base64) into lead rows. Accepts common header
 * spellings (Phone/Number/Mobile, Name) and ignores blank/headerless cells. */
export function parseLeadsWorkbook(base64: string): ImportRow[] {
  const wb = XLSX.read(base64, { type: 'base64' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, CellValue>>(sheet, { defval: '' });
  const pick = (row: Record<string, CellValue>, keys: string[]) => {
    for (const k of Object.keys(row)) {
      if (keys.includes(k.trim().toLowerCase())) return String(row[k] ?? '').trim();
    }
    return '';
  };
  return rows
    .map((row) => ({
      phone: pick(row, ['phone', 'number', 'mobile', 'whatsapp', 'phone number']).replace(/[^\d]/g, ''),
      name: pick(row, ['name', 'full name', 'contact', 'contact name']),
    }))
    .filter((r) => r.phone.length > 0);
}

interface ExportLead {
  phone: string;
  name?: string;
  source_account?: string;
  source_communities?: { name?: string }[];
  source_groups?: { name?: string }[];
  imported_at?: Date | string | null;
}

/** Build an .xlsx (base64) of the given user leads for download. */
export function buildLeadsWorkbook(leads: ExportLead[]): string {
  const rows = leads.map((l) => ({
    Phone: l.phone,
    Name: l.name ?? '',
    'Source Account': l.source_account ?? '',
    Communities: (l.source_communities ?? []).map((c) => c.name).filter(Boolean).join('; '),
    Groups: (l.source_groups ?? []).map((g) => g.name).filter(Boolean).join('; '),
    'Imported At': l.imported_at ? new Date(l.imported_at).toISOString() : '',
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'User Leads');
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}
