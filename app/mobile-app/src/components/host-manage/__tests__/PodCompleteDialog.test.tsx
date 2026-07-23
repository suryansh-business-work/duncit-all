import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodCompleteDialog } from '@/components/host-manage/PodCompleteDialog';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useSettlementPreview', () => ({
  useSettlementPreview: () => ({ settlement: null, isLoading: false }),
}));
jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: (_folder: string, onUploaded: (url: string) => void) => ({
    uploading: false,
    error: undefined,
    pending: null,
    stage: 'processing' as const,
    progress: null,
    pick: jest.fn(() => onUploaded('https://cdn/p.jpg')),
    confirm: jest.fn(),
    cancel: jest.fn(),
  }),
}));
jest.mock('@/hooks/useUploadSettings', () => ({ useUploadSettings: () => null }));
jest.mock('@/hooks/useSupportUpload', () => ({
  useSupportUpload: () => ({
    uploading: false,
    error: undefined,
    pickAndUpload: jest.fn().mockResolvedValue('https://cdn/bill.pdf'),
  }),
}));
const mockRequest = graphqlRequest as jest.Mock;

const venuePod = { id: 'p1', pod_title: 'Cafe jam', venue_id: 'v1' };
const virtualPod = { id: 'p2', pod_title: 'Online jam', venue_id: null };

const addPartyMedia = async () => {
  fireEvent.press(screen.getByTestId('media-upload-add'));
  await waitFor(() =>
    expect(screen.getByTestId('media-thumb-https://cdn/p.jpg')).toBeOnTheScreen(),
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue({
    completePodSettlement: { settlement: { host: { payout_amount: 1 } }, releases: [] },
  });
});

describe('PodCompleteDialog', () => {
  it('renders nothing without a pod', () => {
    renderWithProviders(
      <PodCompleteDialog pod={null} onClose={jest.fn()} onCompleted={jest.fn()} />,
    );
    expect(screen.queryByTestId('pod-complete-dialog')).toBeNull();
  });

  it('submits a virtual pod with only party media (device upload)', async () => {
    const onCompleted = jest.fn();
    renderWithProviders(
      <PodCompleteDialog pod={virtualPod} onClose={jest.fn()} onCompleted={onCompleted} />,
    );
    expect(screen.queryByTestId('field-venue_bill_amount')).toBeNull();
    await addPartyMedia();
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(onCompleted).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { input: expect.objectContaining({ pod_id: 'p2', venue_bill_amount: 0 }) },
      { auth: true },
    );
  });

  it('requires bill amount, bill upload and media for a venue pod', async () => {
    renderWithProviders(
      <PodCompleteDialog pod={venuePod} onClose={jest.fn()} onCompleted={jest.fn()} />,
    );
    expect(screen.getByTestId('field-venue_bill_amount')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(screen.getByTestId('venue_bill_amount-error')).toBeOnTheScreen());
    expect(screen.getByTestId('bill_url-error')).toBeOnTheScreen();
    expect(screen.getByTestId('media_text-error')).toBeOnTheScreen();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('submits a venue pod once the bill + media are uploaded', async () => {
    const onCompleted = jest.fn();
    renderWithProviders(
      <PodCompleteDialog pod={venuePod} onClose={jest.fn()} onCompleted={onCompleted} />,
    );
    fireEvent.changeText(screen.getByTestId('field-venue_bill_amount'), '1500');
    fireEvent.press(screen.getByTestId('bill-upload-add'));
    await waitFor(() => expect(screen.getByTestId('bill-preview')).toBeOnTheScreen());
    await addPartyMedia();
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(onCompleted).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      {
        input: expect.objectContaining({
          venue_bill_amount: 1500,
          bill_url: 'https://cdn/bill.pdf',
        }),
      },
      { auth: true },
    );
  });

  it('surfaces a server failure and a non-Error rejection', async () => {
    renderWithProviders(
      <PodCompleteDialog pod={virtualPod} onClose={jest.fn()} onCompleted={jest.fn()} />,
    );
    await addPartyMedia();
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
    await addPartyMedia();
    fireEvent.press(screen.getByTestId('pod-complete-submit'));
    await waitFor(() => expect(screen.getByText('Submitting…')).toBeOnTheScreen());
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
