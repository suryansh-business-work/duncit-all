const NEEDS_QUOTES = /[",\n\r]/;

const cell = (value: string | number | null | undefined): string => {
  const text = value == null ? '' : String(value);
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** Rows to RFC 4180 CSV text (CRLF line ends, quotes escaped). */
export function toCsv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

/** Hand the reader a file built in the page. */
export function downloadText(fileName: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
