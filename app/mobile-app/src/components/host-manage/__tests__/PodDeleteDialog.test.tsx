import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { PodDeleteDialog } from '@/components/host-manage/PodDeleteDialog';
import { HostDeletePodDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const impact = (over: Record<string, unknown> = {}) => ({
  hostPodDeleteImpact: {
    other_attendee_count: 0,
    refundable_payment_count: 0,
    refund_total: 0,
    currency_symbol: '₹',
    ...over,
  },
});

const renderDialog = (over: Partial<Parameters<typeof PodDeleteDialog>[0]> = {}) =>
  renderWithProviders(
    <PodDeleteDialog
      podId="p1"
      podTitle="Hike"
      onClose={jest.fn()}
      onDeleted={jest.fn()}
      {...over}
    />,
  );

beforeEach(() => jest.clearAllMocks());

describe('PodDeleteDialog', () => {
  it('renders nothing visible without a pod id', () => {
    mockRequest.mockResolvedValue(impact());
    renderWithProviders(
      <PodDeleteDialog podId={null} podTitle="" onClose={jest.fn()} onDeleted={jest.fn()} />,
    );
    expect(screen.queryByTestId('pod-delete-dialog')).toBeNull();
  });

  it('shows the direct-delete impact when no one else joined', async () => {
    mockRequest.mockResolvedValue(impact());
    renderDialog();
    await waitFor(() => expect(screen.getByTestId('pod-delete-impact')).toBeOnTheScreen());
    expect(screen.getByText(/deleted immediately/i)).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('pod-delete-confirm')).getByText('Delete pod'),
    ).toBeOnTheScreen();
  });

  it('shows the refund impact and the refund-initiating confirm label', async () => {
    mockRequest.mockResolvedValue(
      impact({ other_attendee_count: 2, refundable_payment_count: 2, refund_total: 500 }),
    );
    renderDialog();
    await waitFor(() => expect(screen.getByText(/refund of ₹500/i)).toBeOnTheScreen());
    expect(screen.getByText('Initiate refunds & delete')).toBeOnTheScreen();
  });

  it('shows the no-refund audience impact for free pods', async () => {
    mockRequest.mockResolvedValue(impact({ other_attendee_count: 3 }));
    renderDialog();
    await waitFor(() =>
      expect(
        screen.getByText(/3 other attendee\(s\) joined this pod\. All attendees/i),
      ).toBeOnTheScreen(),
    );
  });

  it('demands a reason (and a note for Other) before deleting', async () => {
    mockRequest.mockResolvedValue(impact());
    renderDialog();
    await waitFor(() => expect(screen.getByTestId('pod-delete-impact')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pod-delete-confirm'));
    await waitFor(() => expect(screen.getByText('Select a reason')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pod-delete-reason-Other'));
    fireEvent.press(screen.getByTestId('pod-delete-confirm'));
    await waitFor(() => expect(screen.getByText('Please describe the reason')).toBeOnTheScreen());
    expect(mockRequest).toHaveBeenCalledTimes(1); // impact fetch only
  });

  it('deletes with a subject + note and reports back', async () => {
    const onDeleted = jest.fn();
    mockRequest.mockResolvedValue(impact());
    renderDialog({ onDeleted });
    await waitFor(() => expect(screen.getByTestId('pod-delete-impact')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pod-delete-reason-Venue unavailable'));
    fireEvent.changeText(screen.getByTestId('pod-delete-note'), 'Flooded');
    fireEvent.press(screen.getByTestId('pod-delete-confirm'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenCalledWith(
      HostDeletePodDocument,
      { pod_doc_id: 'p1', reason_subject: 'Venue unavailable', reason_note: 'Flooded' },
      { auth: true },
    );
  });

  it('surfaces a delete failure and a non-Error rejection', async () => {
    mockRequest
      .mockResolvedValueOnce(impact())
      .mockRejectedValueOnce(new Error('FORBIDDEN'))
      .mockRejectedValueOnce('nope');
    renderDialog();
    await waitFor(() => expect(screen.getByTestId('pod-delete-impact')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pod-delete-reason-Low attendance'));
    fireEvent.press(screen.getByTestId('pod-delete-confirm'));
    await waitFor(() => expect(screen.getByText('FORBIDDEN')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pod-delete-confirm'));
    await waitFor(() => expect(screen.getByText('Could not delete the pod')).toBeOnTheScreen());
  });

  it('keeps the spinner when the impact fetch fails, and cancels', async () => {
    const onClose = jest.fn();
    mockRequest.mockRejectedValue(new Error('down'));
    renderDialog({ onClose });
    await act(async () => undefined);
    expect(screen.queryByTestId('pod-delete-impact')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-delete-cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores an impact resolution after unmount', async () => {
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderDialog();
    unmount();
    await act(async () => {
      resolve(impact());
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
