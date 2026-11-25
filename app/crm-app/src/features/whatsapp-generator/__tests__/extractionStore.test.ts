import { act } from '@testing-library/react-native';
import { WA_EXTRACTION_POLL_MS } from '@duncit/utils';

import * as docs from '@/graphql/whatsappGenerator';
import { gqlRequest } from '@/services/graphql.client';
import { useWaExtraction } from '../extractionStore';

jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

/** The app-wide extraction job: polling while it runs, its limits, and sign-out. */

const request = gqlRequest as jest.Mock;
const job = (status: string, id = 'job-1') => ({
  id,
  status,
  total: 10,
  processed: 1,
  valid: 1,
  invalid: 0,
  duplicates: 0,
  communities: 1,
  groups: 1,
  leads_created: 1,
  error: null,
});
const reads = () =>
  request.mock.calls.filter(([d]) => d === docs.CrmAppWhatsappExtractionDocument).length;
const tick = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });
const store = () => useWaExtraction.getState();

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  store().stop();
  jest.useRealTimers();
});

describe('useWaExtraction', () => {
  it('polls a running job until it finishes, then remembers the finish once', async () => {
    const answers = [job('RUNNING'), job('DONE')];
    request.mockImplementation(async () => ({ waExtraction: answers.shift() ?? job('DONE') }));
    await act(() => store().load());
    expect(store().job?.status).toBe('RUNNING');
    expect(store().finishedId).toBeNull();
    await tick(WA_EXTRACTION_POLL_MS);
    expect(store().job?.status).toBe('DONE');
    expect(store().finishedId).toBe('job-1');
    for (let i = 0; i < 3; i += 1) await tick(WA_EXTRACTION_POLL_MS);
    expect(reads()).toBe(2);
  });

  it('keeps no job when there is none, and does not poll', async () => {
    request.mockResolvedValue({ waExtraction: null });
    await act(() => store().load());
    expect(store().job).toBeNull();
    for (let i = 0; i < 2; i += 1) await tick(WA_EXTRACTION_POLL_MS);
    expect(reads()).toBe(1);
  });

  it('stops polling after repeated failed reads', async () => {
    request.mockResolvedValueOnce({ waExtraction: job('RUNNING') });
    await act(() => store().load());
    request.mockRejectedValue(new Error('Network down'));
    // One interval per step: the next read is only scheduled once the last answer is in.
    for (let i = 0; i < 8; i += 1) await tick(WA_EXTRACTION_POLL_MS);
    expect(reads()).toBe(5);
    expect(store().job?.status).toBe('RUNNING');
  });

  it('drops an answer that arrives after sign-out', async () => {
    let answer: (value: unknown) => void = () => undefined;
    request.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const pending = store().load();
    store().stop();
    await act(async () => {
      answer({ waExtraction: job('RUNNING') });
      await pending;
    });
    expect(store().job).toBeNull();
  });

  it('drops a failed read that arrives after sign-out', async () => {
    let fail: (error: Error) => void = () => undefined;
    request.mockReturnValue(new Promise((_, reject) => (fail = reject)));
    const pending = store().load();
    store().stop();
    await act(async () => {
      fail(new Error('Unauthenticated'));
      await pending;
    });
    expect(store().job).toBeNull();
    expect(reads()).toBe(1);
  });

  it('opens the card on start, reports a refusal, and still reads the job', async () => {
    request.mockImplementation(async (doc: unknown) => {
      if (doc === docs.CrmAppWhatsappStartExtractionDocument)
        throw new Error('Session not connected');
      return { waExtraction: job('FAILED') };
    });
    await act(() => store().start('Could not save'));
    expect(store().open).toBe(true);
    expect(store().starting).toBe(false);
    expect(store().error).toBe('Session not connected');
    expect(store().job?.status).toBe('FAILED');
  });

  it('does not read the job for a start that finishes after sign-out', async () => {
    let started: (value: unknown) => void = () => undefined;
    request.mockReturnValue(new Promise((resolve) => (started = resolve)));
    const pending = store().start('Could not save');
    store().stop();
    await act(async () => {
      started({ waStartExtraction: { id: 'job-1' } });
      await pending;
    });
    expect(reads()).toBe(0);
  });

  it('reports a refused cancel, then reads the job again', async () => {
    request.mockImplementation(async (doc: unknown) => {
      if (doc === docs.CrmAppWhatsappCancelExtractionDocument) throw new Error('Gateway went away');
      return { waExtraction: job('RUNNING') };
    });
    await act(() => store().cancel('Could not save'));
    expect(store().error).toBe('Gateway went away');
    expect(reads()).toBe(1);
  });

  it('hides a dismissed job, and opens or collapses the card', async () => {
    request.mockResolvedValue({ waExtraction: job('DONE') });
    store().dismiss();
    expect(store().hiddenId).toBeNull();
    await act(() => store().load());
    store().dismiss();
    expect(store().hiddenId).toBe('job-1');
    store().setOpen(true);
    expect(store().open).toBe(true);
    store().setOpen(false);
    expect(store().open).toBe(false);
  });
});
