import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodCompleteDialog } from '@/components/host-manage/PodCompleteDialog';
import { CompletePodSettlementDocument } from '@/graphql/settlement';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
// PodMediaSummary reaches for the navigator to open the Upload Pod Media
// screen. The dialog renders it, so without this the whole suite dies on
// "Couldn't find a navigation object" before any assertion runs.
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
const mockPreview = { settlement: null as unknown, isLoading: false, error: null as string | null };
// What the dialog asked the preview for: (pod id, bill amount, include slot price).
const mockPreviewArgs = jest.fn();
jest.mock('@/hooks/useSettlementPreview', () => ({
  useSettlementPreview: (...args: unknown[]) => {
    mockPreviewArgs(...args);
    return mockPreview;
  },
}));
jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: (_folder: string, onUploaded: (url: string) => void) => ({
    uploading: false,
    error: undefined,
    pending: null,
    stage: 'processing' as const,
    progress: null,
    pick: jest.fn(async () => onUploaded('https://cdn/p.jpg')),
    confirm: jest.fn(),
    cancel: jest.fn(),
  }),
}));
jest.mock('@/hooks/useUploadSettings', () => ({ useUploadSettings: () => null }));
// PodMediaSummary loads the pod's media board through the same graphqlRequest
// this suite mocks. Left real, its query lands in mockRequest and every
// assertion about what the dialog SENT ends up reading the board query.
jest.mock('@/hooks/usePodMediaBoard', () => ({
  usePodMediaBoard: () => ({ board: null, isLoading: false, error: null, busy: false }),
}));
const mockRequest = graphqlRequest as jest.Mock;

// The bill's upload field mounts the AI-monitoring chip, whose config query goes
// through the same mocked graphqlRequest — so "what the dialog sent" is read off
// the completion mutation alone.
const completionInputs = () =>
  mockRequest.mock.calls
    .filter(([document]) => document === CompletePodSettlementDocument)
    .map(([, variables]) => variables.input);

/** Uploads a bill through the picker, the way the host does. */
const uploadBill = async () => {
  fireEvent.press(screen.getByTestId('media-upload-add'));
  fireEvent.press(screen.getByTestId('cover-device-add'));
  await waitFor(() => expect(screen.getByTestId('cover-tray-remove-0')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('cover-picker-done'));
  expect(screen.getByTestId('media-thumb-https://cdn/p.jpg')).toBeOnTheScreen();
};

const venuePod = { id: 'p1', pod_title: 'Cafe jam', venue_id: 'v1' };
const virtualPod = { id: 'p2', pod_title: 'Online jam', venue_id: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockPreview.settlement = null;
  mockPreview.isLoading = false;
  mockPreview.error = null;
  mockRequest.mockResolvedValue({
    completePodSettlement: { settlement: { host: { payout_amount: 1 } }, releases: [] },
  });
});

describe('PodCompleteDialog', () => {
  it('shows the settlement-preview error instead of a silent blank', () => {
    mockPreview.error = 'Only a host of this pod can do that';
    renderWithProviders(
      <PodCompleteDialog pod={venuePod} onClose={jest.fn()} onCompleted={jest.fn()} />,
    );
    expect(screen.getByTestId('pod-complete-preview-error')).toHaveTextContent(
      'Only a host of this pod can do that',
    );
  });

  it('hides the preview error while a fresh preview is loading', () => {
    mockPreview.error = 'stale error';
    mockPreview.isLoading = true;
    renderWithProviders(
      <PodCompleteDialog pod={venuePod} onClose={jest.fn()} onCompleted={jest.fn()} />,
    );
    expect(screen.queryByTestId('pod-complete-preview-error')).toBeNull();
  });

  it('renders nothing without a pod', () => {
    renderWithProviders(
      <PodCompleteDialog pod={null} onClose={jest.fn()} onCompleted={jest.fn()} />,
    );
    expect(screen.queryByTestId('pod-complete-dialog')).toBeNull();
  });

  it('submits a virtual pod, which is never asked for a bill', async () => {
    const onCompleted = jest.fn();
    renderWithProviders(
      <PodCompleteDialog pod={virtualPod} onClose={jest.fn()} onCompleted={onCompleted} />,
    );
    expect(screen.queryByTestId('pod-complete-venue-bill-fields')).toBeNull();
    expect(screen.queryByTestId('field-venue_bill_amount')).toBeNull();
    expect(screen.queryByTestId('media-upload-add')).toBeNull();
    expect(screen.queryByTestId('pod-complete-include-slot')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(onCompleted).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenCalledWith(
      CompletePodSettlementDocument,
      { input: { pod_id: 'p2', venue_bill_amount: 0 } },
      { auth: true },
    );
  });

  // A free pod's host settles the venue directly — even at a venue, no bill,
  // and the hint promises no payout.
  it('asks a free venue pod for no bill and promises no payout', async () => {
    const onCompleted = jest.fn();
    renderWithProviders(
      <PodCompleteDialog
        pod={{ ...venuePod, pod_type: 'FREE' }}
        onClose={jest.fn()}
        onCompleted={onCompleted}
      />,
    );
    expect(screen.queryByTestId('pod-complete-venue-bill-fields')).toBeNull();
    expect(
      screen.getByText(/It is a free pod, so completing it pays nothing out\./),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('settlement-free')).toHaveTextContent('Free pod');
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(onCompleted).toHaveBeenCalled());
    expect(completionInputs()).toEqual([{ pod_id: 'p1', venue_bill_amount: 0 }]);
  });

  it('keeps the payout hint and the bill on a paid venue pod', () => {
    renderWithProviders(
      <PodCompleteDialog
        pod={{ ...venuePod, pod_type: 'PAID' }}
        onClose={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );
    expect(screen.getByTestId('pod-complete-venue-bill-fields')).toBeOnTheScreen();
    expect(screen.getByText(/Your payout is credited to your wallet/)).toBeOnTheScreen();
    expect(screen.queryByTestId('settlement-free')).toBeNull();
  });

  it('asks a venue pod for its bill, and for the upload and the slot choice only with an amount', () => {
    renderWithProviders(
      <PodCompleteDialog pod={venuePod} onClose={jest.fn()} onCompleted={jest.fn()} />,
    );
    expect(screen.getByTestId('pod-complete-venue-bill-fields')).toBeOnTheScreen();
    expect(screen.getByText('Venue bill')).toBeOnTheScreen();
    expect(screen.getByTestId('field-venue_bill_amount')).toBeOnTheScreen();
    expect(
      screen.getByText('Leave this empty to pay the venue its agreed booking amount.'),
    ).toBeOnTheScreen();
    // Nothing to upload against, and nothing for the bill to come on top of.
    expect(screen.queryByTestId('media-upload-add')).toBeNull();
    expect(screen.queryByTestId('pod-complete-include-slot')).toBeNull();
    expect(mockPreviewArgs).toHaveBeenLastCalledWith('p1', 0, false, undefined, undefined);

    fireEvent.changeText(screen.getByTestId('field-venue_bill_amount'), '1500');
    expect(screen.getByTestId('media-upload-add')).toBeOnTheScreen();
    // The upload is labelled as the bill, and marked required once it is asked for.
    expect(screen.getByLabelText('Upload the venue bill, required')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-complete-include-slot')).toBeOnTheScreen();
    expect(screen.getByText('Also pay the agreed booking amount with this bill')).toBeOnTheScreen();
    expect(mockPreviewArgs).toHaveBeenLastCalledWith('p1', 1500, false, undefined, undefined);

    // The venue's usage re-prices the slot in the preview; an unreadable head count is left out.
    fireEvent.changeText(screen.getByTestId('field-venue_pax'), '12');
    fireEvent.changeText(screen.getByTestId('field-overtime_hours'), '1.5');
    expect(mockPreviewArgs).toHaveBeenLastCalledWith('p1', 1500, false, 12, 1.5);
    fireEvent.changeText(screen.getByTestId('field-venue_pax'), 'abc');
    fireEvent.changeText(screen.getByTestId('field-overtime_hours'), '0');
    expect(mockPreviewArgs).toHaveBeenLastCalledWith('p1', 1500, false, undefined, undefined);

    // Clearing the amount takes both away again.
    fireEvent.changeText(screen.getByTestId('field-venue_bill_amount'), '');
    expect(screen.queryByTestId('media-upload-add')).toBeNull();
    expect(screen.queryByTestId('pod-complete-include-slot')).toBeNull();
  });

  it('submits a venue pod with no bill: the amount goes as zero, with no file or choice', async () => {
    const onCompleted = jest.fn();
    renderWithProviders(
      <PodCompleteDialog pod={venuePod} onClose={jest.fn()} onCompleted={onCompleted} />,
    );
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
    expect(completionInputs()).toEqual([{ pod_id: 'p1', venue_bill_amount: 0 }]);
    expect(screen.queryByTestId('venue_bill_amount-error')).toBeNull();
  });

  it('refuses an amount with no uploaded bill, and sends nothing', async () => {
    const onCompleted = jest.fn();
    renderWithProviders(
      <PodCompleteDialog pod={venuePod} onClose={jest.fn()} onCompleted={onCompleted} />,
    );
    fireEvent.changeText(screen.getByTestId('field-venue_bill_amount'), '1500');
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(screen.getByTestId('media_text-error')).toBeOnTheScreen());
    expect(screen.getByText('Upload the venue bill for the amount you entered')).toBeOnTheScreen();
    expect(completionInputs()).toEqual([]);
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it.each(['abc', '-5'])('refuses the amount "%s", and sends nothing', async (typed) => {
    const onCompleted = jest.fn();
    renderWithProviders(
      <PodCompleteDialog pod={venuePod} onClose={jest.fn()} onCompleted={onCompleted} />,
    );
    fireEvent.changeText(screen.getByTestId('field-venue_bill_amount'), typed);
    // Not an amount, so there is nothing to upload a bill against either.
    expect(screen.queryByTestId('media-upload-add')).toBeNull();
    expect(mockPreviewArgs).toHaveBeenLastCalledWith('p1', 0, false, undefined, undefined);
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(screen.getByTestId('venue_bill_amount-error')).toBeOnTheScreen());
    expect(screen.getByText('Enter a valid bill amount')).toBeOnTheScreen();
    expect(completionInputs()).toEqual([]);
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it('submits a venue pod with the amount and its uploaded bill, replacing the slot price', async () => {
    const onCompleted = jest.fn();
    renderWithProviders(
      <PodCompleteDialog pod={venuePod} onClose={jest.fn()} onCompleted={onCompleted} />,
    );
    fireEvent.changeText(screen.getByTestId('field-venue_bill_amount'), '1500');
    await uploadBill();
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
    expect(completionInputs()).toEqual([
      {
        pod_id: 'p1',
        venue_bill_amount: 1500,
        venue_bill_url: 'https://cdn/p.jpg',
        include_slot_price: false,
      },
    ]);
    expect(screen.queryByTestId('media_text-error')).toBeNull();
  });

  it('carries the slot-price choice into the preview and the submission', async () => {
    const onCompleted = jest.fn();
    renderWithProviders(
      <PodCompleteDialog pod={venuePod} onClose={jest.fn()} onCompleted={onCompleted} />,
    );
    fireEvent.changeText(screen.getByTestId('field-venue_bill_amount'), '1500');
    await uploadBill();
    fireEvent(screen.getByTestId('pod-complete-include-slot-switch'), 'valueChange', true);
    expect(mockPreviewArgs).toHaveBeenLastCalledWith('p1', 1500, true, undefined, undefined);
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
    expect(completionInputs()).toEqual([
      {
        pod_id: 'p1',
        venue_bill_amount: 1500,
        venue_bill_url: 'https://cdn/p.jpg',
        include_slot_price: true,
      },
    ]);
  });

  it('surfaces a server failure and a non-Error rejection', async () => {
    renderWithProviders(
      <PodCompleteDialog pod={virtualPod} onClose={jest.fn()} onCompleted={jest.fn()} />,
    );
    mockRequest.mockRejectedValueOnce(new Error('FORBIDDEN'));
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(screen.getByText('FORBIDDEN')).toBeOnTheScreen());
    mockRequest.mockRejectedValueOnce('nope');
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(screen.getByText('Could not complete the pod')).toBeOnTheScreen());
  });

  it('locks the dialog while submitting and cancels otherwise', async () => {
    const onClose = jest.fn();
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderWithProviders(
      <PodCompleteDialog pod={virtualPod} onClose={onClose} onCompleted={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(screen.getByText('Completing…')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pod-complete-cancel'));
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(async () => {
      resolve({
        completePodSettlement: { settlement: { host: { payout_amount: 1 } }, releases: [] },
      });
      await Promise.resolve();
    });
  });

  it('cancels via the cancel button', () => {
    const onClose = jest.fn();
    renderWithProviders(
      <PodCompleteDialog pod={virtualPod} onClose={onClose} onCompleted={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('pod-complete-cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
