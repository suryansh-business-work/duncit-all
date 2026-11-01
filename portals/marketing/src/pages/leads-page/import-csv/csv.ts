/**
 * A CSV as a spreadsheet exports it, read into rows of cells: commas between
 * cells, quotes around a cell that holds a comma, a quote or a line break,
 * a doubled quote for a quote inside one, CRLF or LF between rows, and a
 * byte-order mark Excel likes to put first. Cells are trimmed; a row with
 * nothing in it is dropped.
 */
const BOM = '﻿';

type State = { cell: string; row: string[]; rows: string[][]; quoted: boolean };

function endCell(state: State): void {
  state.row.push(state.cell.trim());
  state.cell = '';
}

function endRow(state: State): void {
  endCell(state);
  if (state.row.some((cell) => cell !== '')) state.rows.push(state.row);
  state.row = [];
}

/** One character outside quotes: a separator, a line break, an opening quote, or part of the cell. */
function plain(state: State, char: string, next: string): number {
  if (char === ',') {
    endCell(state);
  } else if (char === '\n' || char === '\r') {
    endRow(state);
    return char === '\r' && next === '\n' ? 2 : 1;
  } else if (char === '"' && state.cell === '') {
    state.quoted = true;
  } else {
    state.cell += char;
  }
  return 1;
}

/** One character inside quotes: a doubled quote is a quote, a lone quote closes, anything else is the cell. */
function quoted(state: State, char: string, next: string): number {
  if (char !== '"') {
    state.cell += char;
    return 1;
  }
  if (next === '"') {
    state.cell += '"';
    return 2;
  }
  state.quoted = false;
  return 1;
}

export function parseCsv(text: string): string[][] {
  const source = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  const state: State = { cell: '', row: [], rows: [], quoted: false };
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1] ?? '';
    index += state.quoted ? quoted(state, char, next) : plain(state, char, next);
  }
  if (state.cell !== '' || state.row.length > 0) endRow(state);
  return state.rows;
}

/** The header and the rows under it; a file with no header row has neither. */
export function splitHeader(rows: readonly string[][]): { header: string[]; body: string[][] } {
  const [header = [], ...body] = rows;
  return { header, body };
}
