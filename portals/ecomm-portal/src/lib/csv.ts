/**
 * The little CSV this console reads and writes (packaging round-trips).
 * RFC 4180 quoting: a field with a comma, quote or line break is quoted, and a
 * quote inside it is doubled.
 */

const needsQuotes = /[",\r\n]/;

const cell = (value: unknown): string => {
  let text = '';
  if (typeof value === 'string') text = value;
  else if (typeof value === 'number' || typeof value === 'boolean') text = String(value);
  return needsQuotes.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** Header row plus one line per row, in the headers' order. */
export function toCsv(headers: readonly string[], rows: readonly Record<string, unknown>[]): string {
  return [headers.join(','), ...rows.map((row) => headers.map((h) => cell(row[h])).join(','))].join('\r\n');
}

interface ParseState {
  rows: string[][];
  row: string[];
  field: string;
  quoted: boolean;
}

function endField(state: ParseState) {
  state.row.push(state.field);
  state.field = '';
}

function endRow(state: ParseState) {
  endField(state);
  if (state.row.some((value) => value !== '')) state.rows.push(state.row);
  state.row = [];
}

/** One character outside quotes: a separator ends something, anything else is text. */
function plainChar(state: ParseState, char: string) {
  if (char === ',') endField(state);
  else if (char === '\n') endRow(state);
  else if (char === '"' && state.field === '') state.quoted = true;
  else if (char !== '\r') state.field += char;
}

/** Every non-blank line of a CSV as its fields. */
export function parseCsv(text: string): string[][] {
  const state: ParseState = { rows: [], row: [], field: '', quoted: false };
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (!state.quoted) {
      plainChar(state, char);
    } else if (char === '"' && text[i + 1] === '"') {
      state.field += '"';
      i += 1;
    } else if (char === '"') {
      state.quoted = false;
    } else {
      state.field += char;
    }
  }
  endRow(state);
  return state.rows;
}

/** The rows under a header line, as objects keyed by the (trimmed, lower-cased) header. */
export function csvRecords(text: string): Record<string, string>[] {
  const [header = [], ...rows] = parseCsv(text.replace(/^﻿/, ''));
  const keys = header.map((h) => h.trim().toLowerCase());
  return rows.map((row) => Object.fromEntries(keys.map((key, index) => [key, (row[index] ?? '').trim()])));
}
