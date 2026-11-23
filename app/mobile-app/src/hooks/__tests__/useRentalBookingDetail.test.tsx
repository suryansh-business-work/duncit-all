import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  AddRentalBookingProofDocument,
  RentalBookingDetailDocument,
} from '@/graphql/venue-rentals-desk';
import { useRentalBookingDetail } from '@/hooks/useRentalBookingDetail';
import { graphqlRequest } from '@/services/graphql.client';
import { rentalDetailFixture } from '@/utils/rental-detail-fixture';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => mockRequest.mockReset());

describe('useRentalBookingDetail', () => {
  it('loads the rental by its id, signed in', async () => {
    const detail = rentalDetailFixture();
    mockRequest.mockResolvedValue({ rentalBookingDetail: detail });
    const { result } = renderHook(() => useRentalBookingDetail('b1'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.detail).toEqual(detail));
    expect(result.current).toMatchObject({ loading: false, failed: false });
    expect(mockRequest).toHaveBeenCalledWith(
      RentalBookingDetailDocument,
      { id: 'b1' },
      { auth: true },
    );
  });

  it('reports a failed load instead of an empty rental, and a retry clears it', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Not your venue'));
    const { result } = renderHook(() => useRentalBookingDetail('b1'));
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current).toMatchObject({ detail: null, loading: false });

    mockRequest.mockResolvedValue({ rentalBookingDetail: rentalDetailFixture() });
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.failed).toBe(false);
    expect(result.current.detail?.booking.id).toBe('b1');
  });

  it('adds a proof and swaps in the rental the server answers with', async () => {
    mockRequest.mockResolvedValueOnce({ rentalBookingDetail: rentalDetailFixture({ proofs: [] }) });
    const { result } = renderHook(() => useRentalBookingDetail('b1'));
    await waitFor(() => expect(result.current.detail?.proofs).toEqual([]));

    const after = rentalDetailFixture();
    mockRequest.mockResolvedValueOnce({ addRentalBookingProof: after });
    await act(async () => {
      await result.current.addProof({ note: 'Cracked', image_urls: ['https://x/p.jpg'] });
    });

    expect(mockRequest).toHaveBeenLastCalledWith(
      AddRentalBookingProofDocument,
      { id: 'b1', input: { note: 'Cracked', image_urls: ['https://x/p.jpg'] } },
      { auth: true },
    );
    expect(result.current.detail?.proofs).toHaveLength(1);
  });

  it('lets a refused proof reach the sheet, keeping the rental as it was', async () => {
    const before = rentalDetailFixture({ proofs: [] });
    mockRequest.mockResolvedValueOnce({ rentalBookingDetail: before });
    const { result } = renderHook(() => useRentalBookingDetail('b1'));
    await waitFor(() => expect(result.current.detail).toEqual(before));

    mockRequest.mockRejectedValueOnce(new Error('Add a note or at least one photo'));
    await expect(result.current.addProof({ note: '', image_urls: [] })).rejects.toThrow(
      'Add a note or at least one photo',
    );
    expect(result.current.detail).toEqual(before);
  });
});
