export const STATUS_COLORS: Record<
  string,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'error',
  REFUNDED: 'info',
};

export const fmt = (n: number, sym = '₹') => `${sym}${n.toFixed(2)}`;

/** Maps the table's query state to PaymentFilterInput so the KPI totals track
 * the table's search/status filter (only fields the input supports). */
export function paymentTableFilter(q: {
  search: string;
  filters: { field: string; op: string; value?: string }[];
}): { search?: string; status?: string } | undefined {
  const filter: { search?: string; status?: string } = {};
  const search = q.search.trim();
  if (search) filter.search = search;
  const status = q.filters.find((f) => f.field === 'status' && f.op === 'eq')?.value;
  if (status) filter.status = status;
  return Object.keys(filter).length ? filter : undefined;
}

export function downloadPdfFromBase64(b64: string, filename: string) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.codePointAt(i) ?? 0;
  const blob = new Blob([arr], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
