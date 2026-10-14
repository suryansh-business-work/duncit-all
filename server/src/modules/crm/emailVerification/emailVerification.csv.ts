import * as XLSX from 'xlsx';
import { GraphQLError } from 'graphql';
import { isEmailAddress } from '@utils/email';

/** One upload's ceiling — a bulk check of this size already takes hours of SMTP. */
export const MAX_BULK_EMAILS = 5000;

const EMAIL_HEADER = /e-?mail/i;

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const cellText = (value: unknown): string => String(value ?? '').trim().toLowerCase();

/**
 * The column that holds the addresses: the first header naming an email, else
 * the column with the most email-shaped cells (a file with no header row).
 */
function emailColumn(matrix: unknown[][]): { index: number; hasHeader: boolean } {
  const header = matrix[0] ?? [];
  const named = header.findIndex((cell) => EMAIL_HEADER.test(String(cell ?? '')));
  if (named >= 0) return { index: named, hasHeader: true };

  const width = Math.max(0, ...matrix.map((row) => row.length));
  let best = { index: -1, hits: 0 };
  for (let col = 0; col < width; col++) {
    const hits = matrix.filter((row) => isEmailAddress(cellText(row[col]))).length;
    if (hits > best.hits) best = { index: col, hits };
  }
  return { index: best.index, hasHeader: false };
}

/**
 * The distinct, non-empty values of an uploaded CSV/XLSX's email column, in
 * file order. Malformed values are kept — the check records them as INVALID —
 * so the person sees every row they uploaded accounted for.
 */
export function extractEmails(base64: string): string[] {
  if (!base64) throw badInput('No file content provided');
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(base64, { type: 'base64' });
  } catch {
    throw badInput('Could not read the uploaded file');
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw badInput('The uploaded file has no sheet');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const { index, hasHeader } = emailColumn(matrix);
  if (index < 0) throw badInput('No email column found — add a header named "email"');

  const rows = hasHeader ? matrix.slice(1) : matrix;
  const emails = [...new Set(rows.map((row) => cellText(row[index])).filter(Boolean))];
  if (emails.length === 0) throw badInput('The email column is empty');
  if (emails.length > MAX_BULK_EMAILS) {
    throw badInput(`This file has ${emails.length} emails — split it into files of up to ${MAX_BULK_EMAILS}`);
  }
  return emails;
}
