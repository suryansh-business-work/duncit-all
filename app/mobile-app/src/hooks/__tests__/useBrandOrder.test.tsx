import { act, renderHook, waitFor } from '@testing-library/react-native';

import { shareBase64File } from '@/components/public-page/publicPageRequests';
import { useBrandOrder } from '@/hooks/useBrandOrder';
import { graphqlRequest } from '@/services/graphql.client';
import { HOOK_ADDRESS as ADDRESS, HOOK_ORDER as ORDER } from '@/utils/brand-order-fixture';

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

describe('useBrandOrder — loading', () => {
  it('loads the order by its id', async () => {
    const { result } = await loaded();
    expect(mockRequest.mock.calls[0][1]).toEqual({ id: 'o1' });
    expect(result.current).toMatchObject({
      isLoading: false,
      error: null,
      busy: false,
      notice: null,
    });
  });

  it('holds no order when the server has none for this partner', async () => {
    mockRequest.mockResolvedValueOnce({ brandProductOrder: null });
    const { result } = renderHook(() => useBrandOrder('o1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.order).toBeNull();
  });

  it('says why it did not load, and loads again on retry', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Order not found'));
    const { result } = renderHook(() => useBrandOrder('o1'));
    await waitFor(() => expect(result.current.error).toBe('Order not found'));
    mockRequest.mockResolvedValueOnce({ brandProductOrder: ORDER });
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.order).toEqual(ORDER));
    expect(result.current.error).toBeNull();
  });

  it('falls back to its own sentence when the failure has none', async () => {
    mockRequest.mockRejectedValueOnce({});
    const { result } = renderHook(() => useBrandOrder('o1'));
    await waitFor(() =>
      expect(result.current.error).toBe('Could not load your orders. Try again.'),
    );
  });
});

describe('useBrandOrder — actions', () => {
  it('books the shipment and swaps in the booked order', async () => {
    const { result } = await loaded();
    const booked = { ...ORDER, shiprocket: { order_id: 'sr1', awb: 'AWB1' } };
    mockRequest.mockResolvedValueOnce({ brandBookProductOrderShipment: booked });
    let ok = false;
    await act(async () => {
      ok = await result.current.book();
    });
    expect(ok).toBe(true);
    expect(result.current.order).toEqual(booked);
    expect(result.current.notice).toEqual({
      tone: 'success',
      text: 'Shipment booked with ShipRocket.',
    });
  });

  it('says why a booking stopped part-way, even though the call went through', async () => {
    const { result } = await loaded();
    const stopped = { ...ORDER, last_error: 'Pickup address not verified' };
    mockRequest.mockResolvedValueOnce({ brandBookProductOrderShipment: stopped });
    await act(async () => {
      await result.current.book();
    });
    expect(result.current.order).toEqual(stopped);
    expect(result.current.notice).toEqual({
      tone: 'error',
      text: 'Booking stopped: Pickup address not verified',
    });
  });

  it('refreshes tracking', async () => {
    const { result } = await loaded();
    const tracked = { ...ORDER, fulfilment_status: 'SHIPPED' };
    mockRequest.mockResolvedValueOnce({ brandRefreshProductOrderTracking: tracked });
    await act(async () => {
      await result.current.refreshTracking();
    });
    expect(result.current.order).toEqual(tracked);
    expect(result.current.notice?.text).toBe('Tracking updated.');
  });

  it('saves the corrected address with the email the order already had', async () => {
    const { result } = await loaded();
    const { email, ...form } = ADDRESS;
    const fixed = { ...ORDER, shipping_address: { ...ADDRESS, pincode: '560001' } };
    mockRequest.mockResolvedValueOnce({ brandUpdateProductOrderAddress: fixed });
    await act(async () => {
      await result.current.saveAddress({ ...form, pincode: '560001' });
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      {
        id: 'o1',
        address: { ...form, pincode: '560001', email },
      },
      { auth: true },
    );
    expect(result.current.order).toEqual(fixed);
    expect(result.current.notice?.text).toBe('Delivery address updated.');
  });

  it('refuses a save with the server’s reason and keeps the order as it was', async () => {
    const { result } = await loaded();
    mockRequest.mockRejectedValueOnce(new Error('The shipment is already booked'));
    let ok = true;
    await act(async () => {
      ok = await result.current.saveAddress({ ...ADDRESS });
    });
    expect(ok).toBe(false);
    expect(result.current.order).toEqual(ORDER);
    expect(result.current.notice).toEqual({
      tone: 'error',
      text: 'The shipment is already booked',
    });
    expect(result.current.busy).toBe(false);
  });

  it('sends no email when the order never had a ship-to', async () => {
    mockRequest.mockResolvedValueOnce({ brandProductOrder: { ...ORDER, shipping_address: null } });
    const { result } = renderHook(() => useBrandOrder('o1'));
    await waitFor(() => expect(result.current.order).not.toBeNull());
    mockRequest.mockResolvedValueOnce({ brandUpdateProductOrderAddress: ORDER });
    await act(async () => {
      await result.current.saveAddress({ ...ADDRESS });
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ address: expect.objectContaining({ email: '' }) }),
      { auth: true },
    );
  });
});
