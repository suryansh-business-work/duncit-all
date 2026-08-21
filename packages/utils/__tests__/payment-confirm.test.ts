import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONFIRM_OUTCOME_KEYS,
  classifyConfirmedPayment,
  confirmPaymentAfterTransportFailure,
  isTransportError,
  type PaymentStatusLike,
} from '../src/payment-confirm';

/** A payment row richer than the poller reads, so the generic is exercised. */
type Row = PaymentStatusLike & { id: string };
const row = (status: string, id = 'pay_1'): Row => ({ id, status });

/** A typed read that answers null until a test scripts it call by call. */
const reader = () => vi.fn((): Promise<Row | null> => Promise.resolve(null));

/** Answers the scripted rows one read at a time, then null for any read past the script. */
const scripted = (...rows: Array<Row | null>) => {
  const fetchStatus = reader();
  for (const r of rows) fetchStatus.mockResolvedValueOnce(r);
  return fetchStatus;
};

/** Injected so the poll never waits on the wall clock. */
const noSleep = async () => {};

/** A read that hangs half-open forever, the way the dead verify connection does. */
const hangs = () => new Promise<Row | null>(() => {});

afterEach(() => {
  vi.useRealTimers();
});

describe('isTransportError', () => {
  it('is false when there is no error at all', () => {
    expect(isTransportError(null)).toBe(false);
    expect(isTransportError(undefined)).toBe(false);
  });

  // The resolver RAN and refused — asking again changes nothing, and polling
  // would bury the real failure under a spinner. This wins over any status.
  it('is false once the resolver has answered with a GraphQL error, whatever the status or message', () => {
    expect(
      isTransportError({
        message: 'Insufficient stock',
        graphQLErrors: [{ message: 'Insufficient stock' }],
        networkError: null,
      }),
    ).toBe(false);
    expect(isTransportError({ statusCode: 503, graphQLErrors: [{ message: 'x' }] })).toBe(false);
    // A resolver that refused with the WORD "timeout" in its reason still ran:
    // the GraphQL error wins over the message, not just over the status.
    expect(
      isTransportError({
        message: 'Slot lock timed out, pick another slot',
        graphQLErrors: [{ message: 'Slot lock timed out, pick another slot' }],
      }),
    ).toBe(false);
  });

  it('treats an empty graphQLErrors list as no GraphQL error', () => {
    expect(isTransportError({ statusCode: 502, graphQLErrors: [] })).toBe(true);
  });

  it('is true for the statuses that mean the request never ran to completion', () => {
    expect(isTransportError({ status: 0 })).toBe(true);
    expect(isTransportError({ status: 408 })).toBe(true);
    expect(isTransportError({ status: 425 })).toBe(true);
    expect(isTransportError({ status: 429 })).toBe(true);
  });

  it('is true for any 5xx — the edge or the container, not the resolver', () => {
    expect(isTransportError({ status: 500 })).toBe(true);
    expect(isTransportError({ status: 502 })).toBe(true);
    expect(isTransportError({ status: 504 })).toBe(true);
    expect(isTransportError({ status: 599 })).toBe(true);
  });

  it('reads the status wherever the client hung it', () => {
    expect(isTransportError({ statusCode: 503 })).toBe(true);
    expect(isTransportError({ status: 503 })).toBe(true);
    expect(isTransportError({ response: { status: 503 } })).toBe(true);
    expect(isTransportError({ networkError: { statusCode: 503 } })).toBe(true);
    // A response object that carries no status is not a status.
    expect(isTransportError({ response: {}, networkError: { statusCode: 503 } })).toBe(true);
  });

  // 0 is "no response at all"; it must not be skipped as falsy in favour of a
  // status hung somewhere else (the 400 here would otherwise win and say false).
  it('honours a status of 0 rather than skipping it as falsy', () => {
    expect(isTransportError({ statusCode: 0, status: 400 })).toBe(true);
    expect(isTransportError({ statusCode: 0 })).toBe(true);
  });

  // Apollo's ServerError attaches a networkError object to a 4xx the server
  // chose. A chosen status is the server answering, not a dead connection.
  it('is false for a 4xx the server chose, even with a networkError object attached', () => {
    expect(
      isTransportError({
        statusCode: 400,
        networkError: { message: 'Response not successful: Received status code 400' },
      }),
    ).toBe(false);
    expect(isTransportError({ status: 401 })).toBe(false);
    expect(isTransportError({ status: 404 })).toBe(false);
    // 409 sits between the transport statuses and is a real business answer
    // (slot already taken); 499 is the last status that is still the server's.
    expect(isTransportError({ status: 409 })).toBe(false);
    expect(isTransportError({ status: 499 })).toBe(false);
  });

  // A proxy can answer a dead connection with a status and still describe a
  // timeout, so the message is read even when a status came back.
  it('reads a timeout out of the message even when a non-transport status came back', () => {
    expect(isTransportError({ status: 400, networkError: { message: 'socket hang up' } })).toBe(
      true,
    );
  });

  it('recognises a dead connection by how it names itself', () => {
    expect(isTransportError({ message: 'Request timed out' })).toBe(true);
    expect(isTransportError({ message: 'timeout of 30000ms exceeded' })).toBe(true);
    expect(isTransportError({ message: 'connect ETIMEDOUT 10.0.0.1:443' })).toBe(true);
    expect(isTransportError({ message: 'Network error: dropped' })).toBe(true);
    expect(isTransportError({ message: 'connection closed' })).toBe(true);
    expect(isTransportError({ message: 'connection reset by peer' })).toBe(true);
    // An aborted fetch names itself in `name`, not `message`.
    expect(isTransportError({ name: 'AbortError' })).toBe(true);
    // The native client hangs the message on networkError alone.
    expect(isTransportError({ networkError: { message: 'socket hang up' } })).toBe(true);
    // All three fields present at once are read together.
    expect(
      isTransportError({
        name: 'Error',
        message: 'request failed',
        networkError: { message: 'The operation was aborted' },
      }),
    ).toBe(true);
  });

  it('recognises the fetch-level failures parseApiError treats as offline', () => {
    expect(isTransportError({ message: 'Failed to fetch' })).toBe(true);
    expect(isTransportError({ message: 'Network request failed' })).toBe(true);
    // Safari's wording, with no networkError object to fall back on.
    expect(isTransportError({ message: 'Load failed' })).toBe(true);
  });

  it('falls back to "a networkError object exists" only when no status came back', () => {
    expect(isTransportError({ networkError: {} })).toBe(true);
    expect(isTransportError({ message: 'Something odd', networkError: null })).toBe(false);
    expect(isTransportError({ statusCode: 400, networkError: {} })).toBe(false);
  });

  // A business refusal raised as a plain Error carries no status and no
  // networkError: re-asking the server would not change the answer.
  it('is false for a business error thrown as a plain Error', () => {
    expect(isTransportError(new Error('Insufficient balance'))).toBe(false);
    expect(isTransportError({ message: 'Ticket already used' })).toBe(false);
    expect(isTransportError({})).toBe(false);
  });
});

describe('confirmPaymentAfterTransportFailure', () => {
  // The verify call has only just died; the work that settles the payment
  // needs a moment to land before the first read is worth making.
  it('waits BEFORE every read, for the configured delay', async () => {
    const log: string[] = [];
    const sleep = vi.fn(async (ms: number) => {
      log.push(`sleep:${ms}`);
    });
    const fetchStatus = vi.fn(async () => {
      log.push('read');
      return row('PENDING');
    });
    await confirmPaymentAfterTransportFailure({ fetchStatus, attempts: 2, delayMs: 700, sleep });
    expect(log).toEqual(['sleep:700', 'read', 'sleep:700', 'read']);
  });

  it('returns the SUCCESS row the moment the server settles, without spending the remaining attempts', async () => {
    const success = row('SUCCESS');
    const fetchStatus = scripted(row('PENDING'), success);
    const result = await confirmPaymentAfterTransportFailure({
      fetchStatus,
      attempts: 12,
      sleep: noSleep,
    });
    expect(result).toBe(success);
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });

  // FAILED and REFUNDED are the server's final word too — waiting on them
  // would only keep the buyer under the overlay for nothing.
  it('ends the poll on FAILED and REFUNDED as well as SUCCESS', async () => {
    const failed = scripted(row('FAILED'));
    expect(
      await confirmPaymentAfterTransportFailure({ fetchStatus: failed, attempts: 5, sleep: noSleep }),
    ).toEqual(row('FAILED'));
    expect(failed).toHaveBeenCalledTimes(1);

    const refunded = scripted(row('REFUNDED'));
    expect(
      await confirmPaymentAfterTransportFailure({
        fetchStatus: refunded,
        attempts: 5,
        sleep: noSleep,
      }),
    ).toEqual(row('REFUNDED'));
    expect(refunded).toHaveBeenCalledTimes(1);
  });

  it('keeps polling while PENDING and hands back the LAST row seen when the window closes', async () => {
    const last = row('PENDING', 'pay_3');
    const fetchStatus = scripted(row('PENDING', 'pay_1'), row('PENDING', 'pay_2'), last);
    const result = await confirmPaymentAfterTransportFailure({
      fetchStatus,
      attempts: 3,
      sleep: noSleep,
    });
    expect(result).toBe(last);
    expect(fetchStatus).toHaveBeenCalledTimes(3);
  });

  it('returns null when the payment could never be read, after using every attempt', async () => {
    const fetchStatus = scripted(null, null, null);
    expect(
      await confirmPaymentAfterTransportFailure({ fetchStatus, attempts: 3, sleep: noSleep }),
    ).toBeNull();
    expect(fetchStatus).toHaveBeenCalledTimes(3);
  });

  // The read goes down the same flaky connection the verify call died on.
  it('treats a rejected read as "not read yet" and never throws', async () => {
    const fetchStatus = reader()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValue(row('SUCCESS'));
    await expect(
      confirmPaymentAfterTransportFailure({ fetchStatus, attempts: 3, sleep: noSleep }),
    ).resolves.toEqual(row('SUCCESS'));
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });

  it('swallows a fetchStatus that throws synchronously the same way', async () => {
    const fetchStatus = reader()
      .mockImplementationOnce(() => {
        throw new Error('client not ready');
      })
      .mockResolvedValue(row('SUCCESS'));
    await expect(
      confirmPaymentAfterTransportFailure({ fetchStatus, attempts: 3, sleep: noSleep }),
    ).resolves.toEqual(row('SUCCESS'));
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });

  it('does not let a later failed read erase the last row it did see', async () => {
    const seen = row('PENDING');
    const fetchStatus = reader()
      .mockResolvedValueOnce(seen)
      .mockRejectedValueOnce(new Error('socket hang up'));
    expect(
      await confirmPaymentAfterTransportFailure({ fetchStatus, attempts: 2, sleep: noSleep }),
    ).toBe(seen);
  });

  // Without a deadline the first read never returns, the loop never advances,
  // and the buyer waits under the processing overlay forever.
  it('abandons a read that hangs past the read deadline and moves on to the next attempt', async () => {
    vi.useFakeTimers();
    const fetchStatus = reader()
      .mockImplementationOnce(hangs)
      .mockResolvedValue(row('SUCCESS'));
    const pending = confirmPaymentAfterTransportFailure({
      fetchStatus,
      attempts: 3,
      readTimeoutMs: 50,
      sleep: noSleep,
    });
    await vi.advanceTimersByTimeAsync(49);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual(row('SUCCESS'));
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });

  it('gives a hung read 8 seconds by default', async () => {
    vi.useFakeTimers();
    let settled = false;
    const pending = confirmPaymentAfterTransportFailure({
      fetchStatus: hangs,
      attempts: 1,
      sleep: noSleep,
    }).then((r) => {
      settled = true;
      return r;
    });
    await vi.advanceTimersByTimeAsync(7999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBeNull();
  });

  // A read that answers must take its deadline with it: a poll that leaves a
  // timer per read behind would keep the process (and a test run) alive for
  // up to 8 s after the buyer has already seen the confirmation.
  it('clears the read deadline once a read answers, so no timer outlives the poll', async () => {
    vi.useFakeTimers();
    const fetchStatus = scripted(row('PENDING'), row('SUCCESS'));
    await expect(
      confirmPaymentAfterTransportFailure({ fetchStatus, attempts: 3, sleep: noSleep }),
    ).resolves.toEqual(row('SUCCESS'));
    expect(fetchStatus).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  // The deadline can win and the read can STILL fail afterwards, on the same
  // dead connection. That late failure must be ignored — and must never surface
  // as an unhandled rejection, which vitest fails the whole run on.
  it('ignores a read that fails only after its deadline has already passed', async () => {
    vi.useFakeTimers();
    const fetchStatus = vi.fn(
      () =>
        new Promise<Row | null>((_, reject) => {
          globalThis.setTimeout(() => reject(new Error('socket hang up')), 100);
        }),
    );
    const pending = confirmPaymentAfterTransportFailure({
      fetchStatus,
      attempts: 1,
      readTimeoutMs: 50,
      sleep: noSleep,
    });
    await vi.advanceTimersByTimeAsync(50);
    await expect(pending).resolves.toBeNull();
    // The read's own rejection lands after the poll has already given up on it.
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });

  it('waits 2.5 s between reads and gives up after 12 of them by default', async () => {
    vi.useFakeTimers();
    const fetchStatus = vi.fn().mockResolvedValue(row('PENDING'));
    const pending = confirmPaymentAfterTransportFailure({ fetchStatus });
    await vi.advanceTimersByTimeAsync(2499);
    expect(fetchStatus).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2500 * 11);
    expect(fetchStatus).toHaveBeenCalledTimes(12);
    await expect(pending).resolves.toEqual(row('PENDING'));
    // The window has closed: no further read is ever scheduled.
    await vi.advanceTimersByTimeAsync(2500 * 3);
    expect(fetchStatus).toHaveBeenCalledTimes(12);
  });
});

describe('classifyConfirmedPayment', () => {
  it('hands a SUCCESS row straight through so the caller can drive its confirmation screen', () => {
    const paid = row('SUCCESS');
    const result = classifyConfirmedPayment(paid);
    expect(result).toEqual({ outcome: 'SUCCESS', payment: paid });
    expect(result.outcome === 'SUCCESS' && result.payment).toBe(paid);
  });

  // A caller that asks only `status === 'SUCCESS'` would tell a buyer whose
  // payment definitively failed that it "will appear shortly", and they pay
  // twice or wait for a booking that will never exist.
  it('tells the buyer a FAILED payment failed — never that it is still being confirmed', () => {
    const result = classifyConfirmedPayment(row('FAILED'));
    expect(result).toEqual({ outcome: 'FAILED', messageKey: CONFIRM_OUTCOME_KEYS.FAILED });
    expect(result.outcome === 'FAILED' && result.messageKey).not.toBe(
      CONFIRM_OUTCOME_KEYS.PENDING,
    );
  });

  it('reports a REFUNDED payment as refunded', () => {
    expect(classifyConfirmedPayment(row('REFUNDED'))).toEqual({
      outcome: 'REFUNDED',
      messageKey: CONFIRM_OUTCOME_KEYS.REFUNDED,
    });
  });

  it('says only "still being confirmed" when the payment is PENDING after every attempt', () => {
    expect(classifyConfirmedPayment(row('PENDING'))).toEqual({
      outcome: 'PENDING',
      messageKey: CONFIRM_OUTCOME_KEYS.PENDING,
    });
  });

  // Unreadable is not failed: claiming a failure here would invite a second
  // payment for a booking that may well exist.
  it('treats a payment it could never read as unconfirmed, not as failed', () => {
    expect(classifyConfirmedPayment(null)).toEqual({
      outcome: 'PENDING',
      messageKey: CONFIRM_OUTCOME_KEYS.PENDING,
    });
    expect(classifyConfirmedPayment(undefined)).toEqual({
      outcome: 'PENDING',
      messageKey: CONFIRM_OUTCOME_KEYS.PENDING,
    });
  });

  it('treats a status it does not recognise as unconfirmed', () => {
    expect(classifyConfirmedPayment(row('CREATED'))).toEqual({
      outcome: 'PENDING',
      messageKey: CONFIRM_OUTCOME_KEYS.PENDING,
    });
  });
});

describe('CONFIRM_OUTCOME_KEYS', () => {
  // Only the keys live here; the copy is in the shared mWeb bundle (rule 38),
  // so these exact names are what mWeb and the native app both resolve.
  it('names one distinct mweb.checkout key per outcome the buyer must be told about', () => {
    expect(CONFIRM_OUTCOME_KEYS).toEqual({
      FAILED: 'mweb.checkout.errorConfirmFailed',
      REFUNDED: 'mweb.checkout.errorConfirmRefunded',
      PENDING: 'mweb.checkout.errorConfirmPending',
    });
    expect(new Set(Object.values(CONFIRM_OUTCOME_KEYS)).size).toBe(3);
  });
});
