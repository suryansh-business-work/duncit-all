import { Linking } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { shareBase64File } from '@/components/public-page/publicPageRequests';
import { useBrandOrder } from '@/hooks/useBrandOrder';
import { graphqlRequest } from '@/services/graphql.client';
import { HOOK_ORDER as ORDER } from '@/utils/brand-order-fixture';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/components/public-page/publicPageRequests', () => ({ shareBase64File: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const mockShare = shareBase64File as jest.Mock;

/** Answers the order load, then whatever the test queues next. */
async function loaded() {
  mockRequest.mockResolvedValueOnce({ brandProductOrder: ORDER });
  const hook = renderHook(() => useBrandOrder('o1'));
  await waitFor(() => expect(hook.result.current.order).toEqual(ORDER));
  return hook;
}

beforeEach(() => {
  mockRequest.mockReset();
  mockShare.mockReset();
});

describe('useBrandOrder — documents and failed actions', () => {
  it('saves the label by handing its PDF to the share sheet', async () => {
    const { result } = await loaded();
    const file = { filename: 'label-DUN-1.pdf', mime: 'application/pdf', content_base64: 'JVBE' };
    mockRequest.mockResolvedValueOnce({ brandProductOrderShipmentFile: file });
    mockShare.mockResolvedValueOnce(true);
    await act(async () => {
      await result.current.document('LABEL', 'download');
    });
    // Matched by variables: the translator's one-time locale fetch also goes through graphqlRequest.
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { ids: ['o1'], kind: 'LABEL' },
      { auth: true },
    );
    expect(mockShare).toHaveBeenCalledWith('JVBE', 'label-DUN-1.pdf', 'application/pdf');
    expect(result.current.notice).toBeNull();
  });

  it('prints from the copy ShipRocket links to, when there is one', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { result } = await loaded();
    await act(async () => {
      await result.current.document('INVOICE', 'print');
    });
    expect(open).toHaveBeenCalledWith('https://sr/invoice.pdf');
    expect(mockRequest).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });

  it('prints through the share sheet when ShipRocket has no link for it', async () => {
    const { result } = await loaded();
    mockRequest.mockResolvedValueOnce({
      brandProductOrderShipmentFile: {
        filename: 'm.pdf',
        mime: 'application/pdf',
        content_base64: 'JVBE',
      },
    });
    mockShare.mockResolvedValueOnce(false);
    await act(async () => {
      await result.current.document('MANIFEST', 'print');
    });
    // Matched by variables: the translator's one-time locale fetch also goes through graphqlRequest.
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { ids: ['o1'], kind: 'MANIFEST' },
      { auth: true },
    );
    expect(result.current.notice).toEqual({
      tone: 'error',
      text: 'This device cannot save or share files.',
    });
  });

  it('fetches the file when asked before the order has loaded', async () => {
    mockRequest.mockReturnValueOnce(new Promise(() => undefined));
    const { result } = renderHook(() => useBrandOrder('o1'));
    mockRequest.mockResolvedValueOnce({
      brandProductOrderShipmentFile: {
        filename: 'i.pdf',
        mime: 'application/pdf',
        content_base64: 'JVBE',
      },
    });
    mockShare.mockResolvedValueOnce(true);
    await act(async () => {
      await result.current.document('INVOICE', 'print');
    });
    expect(mockShare).toHaveBeenCalledWith('JVBE', 'i.pdf', 'application/pdf');
  });

  it('falls back to its own sentence when an action fails without one', async () => {
    const { result } = await loaded();
    mockRequest.mockRejectedValueOnce({});
    await act(async () => {
      await result.current.refreshTracking();
    });
    expect(result.current.notice).toEqual({ tone: 'error', text: 'That did not work. Try again.' });
  });
});
