import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodEditDialog } from '@/components/host-manage/PodEditDialog';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: () => ({ uploading: false, error: undefined, pickAndUpload: jest.fn() }),
}));
const mockRequest = graphqlRequest as jest.Mock;

const pod = {
  id: 'p1',
  pod_title: 'Sunday community hike',
  pod_description: 'A relaxed group hike around the lake.',
  pod_images_and_videos: [{ url: 'https://cdn/img.jpg', type: 'IMAGE' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue({ hostUpdatePod: { id: 'p1' } });
});

describe('PodEditDialog', () => {
  it('renders nothing visible without a pod', () => {
    renderWithProviders(<PodEditDialog pod={null} onClose={jest.fn()} onSaved={jest.fn()} />);
    expect(screen.queryByTestId('pod-edit-dialog')).toBeNull();
  });

  it('prefills, saves the limited fields and reports back', async () => {
    const onSaved = jest.fn();
    renderWithProviders(<PodEditDialog pod={pod} onClose={jest.fn()} onSaved={onSaved} />);
    expect(screen.getByTestId('pod-edit-dialog')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('field-pod_title'), 'New title');
    fireEvent.press(screen.getByTestId('pod-edit-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      {
        pod_doc_id: 'p1',
        input: expect.objectContaining({ pod_title: 'New title' }),
      },
      { auth: true },
    );
  });

  it('blocks an invalid submit with field errors', async () => {
    renderWithProviders(<PodEditDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('field-pod_title'), 'x');
    // Removing the only prefilled image leaves media_text empty → media validation fails.
    fireEvent.press(screen.getByTestId('media-remove-https://cdn/img.jpg'));
    fireEvent.press(screen.getByTestId('pod-edit-save'));
    await waitFor(() => expect(screen.getByTestId('pod_title-error')).toBeOnTheScreen());
    expect(screen.getByTestId('media_text-error')).toBeOnTheScreen();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('surfaces a server failure and a non-Error rejection', async () => {
    mockRequest.mockRejectedValueOnce(new Error('FORBIDDEN'));
    renderWithProviders(<PodEditDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    fireEvent.press(screen.getByTestId('pod-edit-save'));
    await waitFor(() => expect(screen.getByTestId('pod-edit-error')).toBeOnTheScreen());
    expect(screen.getByText('FORBIDDEN')).toBeOnTheScreen();

    mockRequest.mockRejectedValueOnce('nope');
    fireEvent.press(screen.getByTestId('pod-edit-save'));
    await waitFor(() => expect(screen.getByText('Could not save the pod')).toBeOnTheScreen());
  });

  it('locks the dialog while the save is in flight', async () => {
    const onClose = jest.fn();
    const onSaved = jest.fn();
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderWithProviders(<PodEditDialog pod={pod} onClose={onClose} onSaved={onSaved} />);
    fireEvent.press(screen.getByTestId('pod-edit-save'));
    await waitFor(() => expect(screen.getByText('Saving…')).toBeOnTheScreen());
    // While busy, cancel and a second save are no-ops.
    fireEvent.press(screen.getByTestId('pod-edit-cancel'));
    fireEvent.press(screen.getByTestId('pod-edit-save'));
    expect(onClose).not.toHaveBeenCalled();
    expect(mockRequest).toHaveBeenCalledTimes(1);
    await waitFor(async () => {
      resolve({ hostUpdatePod: { id: 'p1' } });
      await Promise.resolve();
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('cancels via the cancel button', () => {
    const onClose = jest.fn();
    renderWithProviders(<PodEditDialog pod={pod} onClose={onClose} onSaved={jest.fn()} />);
    fireEvent.press(screen.getByTestId('pod-edit-cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
