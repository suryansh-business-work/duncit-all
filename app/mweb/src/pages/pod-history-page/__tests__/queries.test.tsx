import { describe, expect, it } from 'vitest';

import * as queries from '../queries';

type OpKind = 'query' | 'mutation';

const opName = (doc: unknown): string | undefined => {
  const def = (doc as { definitions?: Array<{ kind: string; operation?: string; name?: { value: string } }> })
    .definitions?.[0];
  return def?.name?.value;
};

const opType = (doc: unknown): OpKind | undefined => {
  const def = (doc as { definitions?: Array<{ operation?: OpKind }> }).definitions?.[0];
  return def?.operation;
};

const body = (doc: unknown): string => ((doc as { loc?: { source: { body: string } } }).loc?.source.body ?? '');

describe('pod-history-page queries module', () => {
  const cases: Array<[keyof typeof queries, string, OpKind]> = [
    ['MY_POD_MEMBERSHIPS', 'MyPodMembershipsForHistory', 'query'],
    ['POD_HISTORY_CATEGORIES', 'PodHistoryCategories', 'query'],
    ['BACKOUT_POD_HISTORY', 'BackoutPodFromHistory', 'mutation'],
    ['REJOIN_POD', 'RejoinPodFromHistory', 'mutation'],
    ['POD_HISTORY_INVOICE_PDF', 'PodHistoryInvoicePdf', 'query'],
    ['POD_HISTORY_TICKET_FOR_POD', 'PodHistoryTicketForPod', 'query'],
    ['POD_HISTORY_TICKET_PDF', 'PodHistoryTicketPdf', 'query'],
  ];

  it.each(cases)('%s is a valid %s document named %s', (exportKey, expectedName, expectedType) => {
    const doc = queries[exportKey];
    expect(doc).toBeDefined();
    expect((doc as { kind?: string }).kind).toBe('Document');
    expect(opName(doc)).toBe(expectedName);
    expect(opType(doc)).toBe(expectedType);
  });

  it('exposes exactly the expected unique named operations', () => {
    const names = cases.map(([key]) => opName(queries[key])).filter(Boolean);
    expect(new Set(names).size).toBe(cases.length);
  });

  it('MY_POD_MEMBERSHIPS selects membership + nested pod fields', () => {
    const source = body(queries.MY_POD_MEMBERSHIPS);
    for (const field of [
      'myPodMemberships',
      'status',
      'refund_status',
      'referral_token',
      'pod {',
      'pod_images_and_videos {',
      'club {',
      'category_id',
      'super_category_id',
    ]) {
      expect(source).toContain(field);
    }
  });

  it('category + mutation + pdf documents declare their variables', () => {
    expect(body(queries.POD_HISTORY_CATEGORIES)).toContain('categories {');
    expect(body(queries.BACKOUT_POD_HISTORY)).toContain('$pod_doc_id: ID!');
    expect(body(queries.BACKOUT_POD_HISTORY)).toContain('backoutPod(pod_doc_id: $pod_doc_id)');
    expect(body(queries.REJOIN_POD)).toContain('rejoinPod(pod_doc_id: $pod_doc_id)');
    expect(body(queries.POD_HISTORY_INVOICE_PDF)).toContain('paymentInvoicePdfBase64(payment_doc_id: $id)');
    expect(body(queries.POD_HISTORY_TICKET_FOR_POD)).toContain('myEventTicketForPod(pod_doc_id: $podId)');
    expect(body(queries.POD_HISTORY_TICKET_PDF)).toContain('eventTicketPdfBase64(ticket_doc_id: $id)');
  });
});
