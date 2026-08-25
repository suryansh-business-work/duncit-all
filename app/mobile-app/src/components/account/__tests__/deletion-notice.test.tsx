import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { DeletionNoticeDialog, DeletionSubmittedDialog } from '@/components/account';
import {
  MobileCancelAccountDeletionRequestDocument,
  MobileMyAccountDeletionRequestDocument,
} from '@/graphql/account';
import { graphqlRequest } from '@/services/graphql.client';
import { useAuthStore } from '@/stores/auth.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;

const request = {
  request_id: 'DUN-ADR-1A2B3C',
  requested_at: '2026-08-25T00:00:00.000Z',
  scheduled_delete_at: '2026-09-24T00:00:00.000Z',
  days_remaining: 30,
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ token: 'signed-in' });
});

describe('DeletionSubmittedDialog', () => {
  it('names the date and offers only the sign-out', () => {
    const onSignOut = jest.fn();
    renderWithProviders(
      <DeletionSubmittedDialog
        open
        code="DUN-ADR-1A2B3C"
        deletesOn={request.scheduled_delete_at}
        onSignOut={onSignOut}
      />,
    );
    expect(screen.getByTestId('deletion-sign-out')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('deletion-sign-out'));
    expect(onSignOut).toHaveBeenCalled();
  });

  it('is hidden when closed', () => {
    renderWithProviders(
      <DeletionSubmittedDialog open={false} code="X" deletesOn="" onSignOut={jest.fn()} />,
    );
    expect(screen.queryByTestId('deletion-sign-out')).toBeNull();
  });
});

describe('DeletionNoticeDialog', () => {
  it('warns a returning member and reads their open request', async () => {
    mockRequest.mockResolvedValue({ myAccountDeletionRequest: request });
    renderWithProviders(<DeletionNoticeDialog />);
    await waitFor(() => expect(screen.getByTestId('deletion-notice-withdraw')).toBeOnTheScreen());
    expect(mockRequest).toHaveBeenCalledWith(MobileMyAccountDeletionRequestDocument, undefined, {
      auth: true,
    });
  });

  it('stays out of the way when there is no open request', async () => {
    mockRequest.mockResolvedValue({ myAccountDeletionRequest: null });
    renderWithProviders(<DeletionNoticeDialog />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(screen.queryByTestId('deletion-notice-withdraw')).toBeNull();
  });

  it('does not ask a signed-out install', () => {
    useAuthStore.setState({ token: null });
    renderWithProviders(<DeletionNoticeDialog />);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('withdraws the request and closes', async () => {
    mockRequest.mockResolvedValueOnce({ myAccountDeletionRequest: request });
    renderWithProviders(<DeletionNoticeDialog />);
    await waitFor(() => expect(screen.getByTestId('deletion-notice-withdraw')).toBeOnTheScreen());
    mockRequest.mockResolvedValueOnce({ cancelMyAccountDeletionRequest: { id: 'r1' } });
    fireEvent.press(screen.getByTestId('deletion-notice-withdraw'));
    await waitFor(() => expect(screen.queryByTestId('deletion-notice-withdraw')).toBeNull());
    expect(mockRequest).toHaveBeenCalledWith(
      MobileCancelAccountDeletionRequestDocument,
      undefined,
      { auth: true },
    );
  });

  it('keeps the request when the member says so', async () => {
    mockRequest.mockResolvedValue({ myAccountDeletionRequest: request });
    renderWithProviders(<DeletionNoticeDialog />);
    await waitFor(() => expect(screen.getByTestId('deletion-notice-keep')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('deletion-notice-keep'));
    await waitFor(() => expect(screen.queryByTestId('deletion-notice-keep')).toBeNull());
  });

  it('surfaces a failed withdrawal instead of pretending it worked', async () => {
    mockRequest.mockResolvedValueOnce({ myAccountDeletionRequest: request });
    renderWithProviders(<DeletionNoticeDialog />);
    await waitFor(() => expect(screen.getByTestId('deletion-notice-withdraw')).toBeOnTheScreen());
    mockRequest.mockRejectedValueOnce(new Error('nope'));
    fireEvent.press(screen.getByTestId('deletion-notice-withdraw'));
    await waitFor(() =>
      expect(screen.getByTestId('deletion-notice-error')).toHaveTextContent('nope'),
    );
  });

  it('swallows a read failure rather than shouting over the home screen', async () => {
    mockRequest.mockRejectedValue('offline');
    renderWithProviders(<DeletionNoticeDialog />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(screen.queryByTestId('deletion-notice-withdraw')).toBeNull();
  });
});
