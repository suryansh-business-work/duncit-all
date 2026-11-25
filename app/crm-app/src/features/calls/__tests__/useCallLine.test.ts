import { act, renderHook, waitFor } from '@testing-library/react-native';

import * as docs from '@/graphql/call';
import { gqlRequest } from '@/services/graphql.client';
import type { CallLead } from '../callLine';
import { useCallLine } from '../useCallLine';

jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

/** Placing and driving a call on the CRM call line, and what each failure leaves on screen. */

const request = gqlRequest as jest.Mock;
const LEAD: CallLead = { to: '9811000001', kind: 'HOST_LEAD', leadId: 'h1', leadName: 'Run Club' };
const FALLBACK = 'Could not place the call.';

type Handler = () => unknown;
const serve = (handlers: Map<unknown, Handler>) =>
  request.mockImplementation(async (doc: unknown) => {
    const handler = handlers.get(doc);
    if (handler) return handler();
    if (doc === docs.CrmAppActiveCallDocument) return { myActiveCrmCall: null };
    if (doc === docs.CrmAppStartCallDocument)
      return { startCrmPortalCall: { ok: true, message: '', code: null, log_id: 'log1' } };
    throw new Error('unexpected operation');
  });

const placed = async (handlers: Map<unknown, Handler> = new Map()) => {
  serve(handlers);
  const hook = renderHook(() => useCallLine(LEAD, FALLBACK));
  await act(async () => hook.result.current.start());
  return hook;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useCallLine', () => {
  it('controls nothing before a call is placed', async () => {
    serve(new Map());
    const { result } = renderHook(() => useCallLine(LEAD, FALLBACK));
    await waitFor(() => expect(request).toHaveBeenCalled());
    let accepted = true;
    await act(async () => {
      accepted = await result.current.control('MUTE');
    });
    expect(accepted).toBe(false);
    expect(request.mock.calls.some(([doc]) => doc === docs.CrmAppControlCallDocument)).toBe(false);
  });

  it('places the call without a contact name when the contact has none', async () => {
    const { result } = await placed();
    expect(result.current.logId).toBe('log1');
    expect(result.current.status).toBe('INITIATED');
    const start = request.mock.calls.find(([doc]) => doc === docs.CrmAppStartCallDocument);
    expect(start?.[1]).toMatchObject({ entity_type: 'HOST_LEAD', id: 'h1', contact_name: null });
  });

  it('shows the portal’s words when a refusal carries no message or code', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppStartCallDocument,
          () => ({ startCrmPortalCall: { ok: false, message: '', code: null, log_id: null } }),
        ],
      ]),
    );
    const { result } = renderHook(() => useCallLine(LEAD, FALLBACK));
    await act(async () => result.current.start());
    expect(result.current.error).toBe(FALLBACK);
    expect(result.current.errorCode).toBe('UNKNOWN');
    expect(result.current.logId).toBeNull();
  });

  it('keeps the call as it was when Twilio refuses a control, with its reason', async () => {
    const { result } = await placed(
      new Map<unknown, Handler>([
        [
          docs.CrmAppControlCallDocument,
          () => ({
            controlCrmCall: {
              ok: false,
              message: 'The call has ended',
              status: 'COMPLETED',
              muted: false,
              on_hold: false,
            },
          }),
        ],
      ]),
    );
    let accepted = true;
    await act(async () => {
      accepted = await result.current.control('HOLD');
    });
    expect(accepted).toBe(false);
    expect(result.current.error).toBe('The call has ended');
    expect(result.current.onHold).toBe(false);
    expect(result.current.busy).toBeNull();
  });

  it('falls back to the portal’s words when a control fails outright or is refused silently', async () => {
    const { result } = await placed(
      new Map<unknown, Handler>([
        [
          docs.CrmAppControlCallDocument,
          () => ({
            controlCrmCall: { ok: false, message: '', status: null, muted: false, on_hold: false },
          }),
        ],
      ]),
    );
    await act(async () => {
      await result.current.control('MUTE');
    });
    expect(result.current.error).toBe(FALLBACK);

    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppControlCallDocument,
          () => {
            throw new Error('');
          },
        ],
      ]),
    );
    await act(async () => {
      await result.current.control('END');
    });
    expect(result.current.error).toBe(FALLBACK);
  });
});
