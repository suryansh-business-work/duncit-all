/**
 * Builds a CSV file body. Every cell is quoted, so commas, quotes and line
 * breaks in a member's name survive; a cell a spreadsheet would read as a
 * formula (=, +, -, @, tab, return) is prefixed with an apostrophe, so opening
 * the print file can never run anything.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

const cell = (value: string | number): string => {
  const text = String(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

export function toCsv(header: readonly string[], rows: ReadonlyArray<ReadonlyArray<string | number>>): string {
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}
