import { act, renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { TicketWalletLinksDocument } from '@/graphql/pod-history';
import { useTicketWalletLinks } from '@/hooks/useTicketWalletLinks';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const links = {
  apple_pass_url: 'https://server.test/tickets/tok/ticket.pkpass',
  google_save_url: 'https://pay.google.com/gp/v/save/jwt',
};

beforeEach(() => mockRequest.mockReset());

describe('useTicketWalletLinks', () => {
  it('starts empty, then returns the server links for the pod', async () => {
    mockRequest.mockResolvedValue({ myEventTicketWalletLinks: links });
    const { result } = renderHook(() => useTicketWalletLinks('p1'));

    expect(result.current).toEqual({ apple_pass_url: null, google_save_url: null });
    await waitFor(() => expect(result.current).toEqual(links));
    expect(mockRequest).toHaveBeenCalledWith(
      TicketWalletLinksDocument,
      { podId: 'p1' },
      { auth: true },
    );
  });

  it('asks nothing without a pod', () => {
    const { result } = renderHook(() => useTicketWalletLinks(undefined));

    expect(result.current).toEqual({ apple_pass_url: null, google_save_url: null });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('stays empty and logs when the request fails', async () => {
    const logError = jest.spyOn(logs.mobileApp, 'error').mockImplementation(() => undefined);
    const failure = new Error('offline');
    mockRequest.mockRejectedValue(failure);
    const { result } = renderHook(() => useTicketWalletLinks('p1'));

    await waitFor(() =>
      expect(logError).toHaveBeenCalledWith('checkout', 'ticketWalletLinks', { error: failure }),
    );
    expect(result.current).toEqual({ apple_pass_url: null, google_save_url: null });
    logError.mockRestore();
  });

  it('drops an answer that lands after unmount', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { result, unmount } = renderHook(() => useTicketWalletLinks('p1'));
    unmount();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => {
      resolve({ myEventTicketWalletLinks: links });
    });
    expect(result.current).toEqual({ apple_pass_url: null, google_save_url: null });
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
