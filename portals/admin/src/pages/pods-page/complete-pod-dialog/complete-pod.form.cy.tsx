import { describe, expect, it } from 'vitest';
import { buildCompleteInput, buildCompleteSchema, mediaTextToInput } from './complete-pod.form';
import type { CompletePodValues } from './complete-pod.types';

const valid = (over: Partial<CompletePodValues> = {}): CompletePodValues => ({
  host_user_id: 'u1',
  venue_bill_amount: 1500,
  bill_url: 'https://cdn.test/bill.pdf',
  media_text: 'https://cdn.test/party.jpg',
  notes: '',
  ...over,
});

const errorsOf = async (hasVenue: boolean, values: CompletePodValues) =>
  buildCompleteSchema(hasVenue)
    .validate(values, { abortEarly: false })
    .then(() => [] as string[])
    .catch((e) => e.errors as string[]);

describe('buildCompleteSchema', () => {
  it('accepts a complete venue submission', async () => {
    expect(await errorsOf(true, valid())).toEqual([]);
  });

  it('requires party media regardless of venue', async () => {
    expect((await errorsOf(true, valid({ media_text: '' }))).join(' ')).toMatch(/party/i);
    expect((await errorsOf(false, valid({ media_text: '' }))).join(' ')).toMatch(/party/i);
  });

  it('requires a bill amount + upload only for venue pods', async () => {
    const errs = (await errorsOf(true, valid({ venue_bill_amount: 0, bill_url: '' }))).join(' ');
    expect(errs).toMatch(/venue bill/i);
    expect(errs).toMatch(/bill upload/i);
    // Virtual pod (no venue): no bill needed.
    expect(await errorsOf(false, valid({ venue_bill_amount: 0, bill_url: '' }))).toEqual([]);
  });
});

describe('buildCompleteInput', () => {
  it('maps amounts and typed media', () => {
    const input = buildCompleteInput(valid({ media_text: 'https://cdn.test/a.jpg\nhttps://cdn.test/b.mp4' }), 'pod1');
    expect(input.pod_id).toBe('pod1');
    expect(input.venue_bill_amount).toBe(1500);
    expect(input.evidence_media).toEqual([
      { url: 'https://cdn.test/a.jpg', type: 'IMAGE' },
      { url: 'https://cdn.test/b.mp4', type: 'VIDEO' },
    ]);
  });
});

describe('mediaTextToInput', () => {
  it('maps videos in evidence media', () => {
    expect(mediaTextToInput('https://cdn.test/party.mp4')[0].type).toBe('VIDEO');
  });
});
