/**
 * Reading the stores' report files.
 *
 * Google Play's bulk reports are CSV written in UTF-16LE with a byte-order
 * mark; Apple's analytics report segments are UTF-8 and tab-separated. Review
 * text carries commas, quotes and line breaks, so fields are read with RFC
 * 4180 quoting rather than split on separators.
 *
 * Columns are found by their HEADING, never their position, and headings are
 * compared loosely (case, spaces and punctuation ignored): both stores have
 * added and renamed columns over the years, and a report with a column moved
 * must still read the same.
 */

const UTF16LE_BOM = [0xff, 0xfe];
const UTF16BE_BOM = [0xfe, 0xff];

/** The file's bytes as text: UTF-16 when it opens with a byte-order mark, UTF-8 otherwise. */
export function decodeReport(bytes: Uint8Array): string {
  if (bytes[0] === UTF16LE_BOM[0] && bytes[1] === UTF16LE_BOM[1]) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes[0] === UTF16BE_BOM[0] && bytes[1] === UTF16BE_BOM[1]) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }
  // TextDecoder drops a UTF-8 byte-order mark by itself.
  return new TextDecoder('utf-8').decode(bytes);
}

/** The separator the header line uses: a tab when it has one, a comma otherwise. */
export function separatorOf(text: string): ',' | '\t' {
  const end = text.indexOf('\n');
  const header = end === -1 ? text : text.slice(0, end);
  return header.includes('\t') ? '\t' : ',';
}

interface ParseState {
  rows: string[][];
  row: string[];
  field: string;
  quoted: boolean;
}

function endField(state: ParseState): void {
  state.row.push(state.field);
  state.field = '';
}

function endRow(state: ParseState): void {
  endField(state);
  // A blank line is one empty field — not a row.
  if (state.row.length > 1 || state.row[0] !== '') state.rows.push(state.row);
  state.row = [];
}

/** One character inside a quoted field. Returns how many characters it used. */
function readQuoted(state: ParseState, text: string, i: number): number {
  const ch = text[i];
  if (ch !== '"') {
    state.field += ch;
    return 1;
  }
  if (text[i + 1] === '"') {
    state.field += '"';
    return 2;
  }
  state.quoted = false;
  return 1;
}

/** Every row of a delimited file, quotes honoured. Line endings may be \n or \r\n. */
export function parseDelimited(text: string, separator: string = separatorOf(text)): string[][] {
  const state: ParseState = { rows: [], row: [], field: '', quoted: false };
  let i = 0;
  while (i < text.length) {
    if (state.quoted) {
      i += readQuoted(state, text, i);
      continue;
    }
    const ch = text[i];
    if (ch === '"' && state.field === '') state.quoted = true;
    else if (ch === separator) endField(state);
    else if (ch === '\n') endRow(state);
    else if (ch !== '\r') state.field += ch;
    i += 1;
  }
  if (state.field !== '' || state.row.length > 0) endRow(state);
  return state.rows;
}

/** A heading reduced to letters and digits, lower-case: "Daily Device Installs" → "dailydeviceinstalls". */
export const normalizeHeading = (heading: string): string => heading.toLowerCase().replaceAll(/[^a-z0-9]/g, '');

/** One data row, read by heading. */
export interface ReportRow {
  /** The cell under the first of `headings` the file has; '' when it has none of them. */
  text(...headings: string[]): string;
  /** The same cell as a number; null when absent, blank or not a number. */
  num(...headings: string[]): number | null;
}

/** The rows of a report as records read by heading. A file with no data rows reads as none. */
export function reportRows(text: string): ReportRow[] {
  const [header, ...rows] = parseDelimited(text);
  if (!header) return [];
  const index = new Map<string, number>();
  header.forEach((heading, i) => {
    const key = normalizeHeading(heading);
    if (!index.has(key)) index.set(key, i);
  });
  const cellOf = (cells: string[], headings: string[]): string => {
    for (const heading of headings) {
      const at = index.get(normalizeHeading(heading));
      if (at !== undefined) return (cells[at] ?? '').trim();
    }
    return '';
  };
  return rows.map((cells) => ({
    text: (...headings) => cellOf(cells, headings),
    num: (...headings) => {
      const raw = cellOf(cells, headings).replaceAll(',', '');
      if (raw === '') return null;
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    },
  }));
}

/** The calendar day a report's date cell names, yyyy-MM-dd, or null when it is not a date. */
export function dayOf(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}
