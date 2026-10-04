import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PodEditDialog } from '@/components/host-manage/PodEditDialog';
import { ModeratePodContentDocument } from '@/graphql/create-pod';
import { HostUpdatePodDocument, PodSpotLimitsDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: () => ({
    uploading: false,
    error: undefined,
    pending: null,
    stage: 'processing' as const,
    progress: null,
    pick: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
  }),
}));
jest.mock('@/hooks/useUploadSettings', () => ({ useUploadSettings: () => null }));
const mockRequest = graphqlRequest as jest.Mock;

const pod = {
  id: 'p1',
  pod_title: 'Sunday community hike',
  pod_description: 'A relaxed group hike around the lake.',
  pod_images_and_videos: [{ url: 'https://cdn/img.jpg', type: 'IMAGE' }],
};

// The sheet talks to the server four ways: the AI-monitoring copy, the spot
// range, the content check and the write. Route each to its own mock so a test
// steers the one it is about and the others behave like a healthy server.
const mockSave = jest.fn();
const mockModerate = jest.fn();
const saveCalls = () => mockRequest.mock.calls.filter(([doc]) => doc === HostUpdatePodDocument);

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockReset().mockResolvedValue({ hostUpdatePod: { id: 'p1' } });
  mockModerate
    .mockReset()
    .mockResolvedValue({ moderatePodContent: { allowed: true, violations: [] } });
  mockRequest.mockImplementation((doc: unknown, vars: unknown) => {
    if (doc === HostUpdatePodDocument) return mockSave(vars);
    if (doc === ModeratePodContentDocument) return mockModerate(vars);
    if (doc === PodSpotLimitsDocument) return Promise.resolve({ podSpotLimits: null });
    return Promise.resolve({ aiMonitoringConfig: null });
  });
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
    // The content check runs on the edited copy before the write.
    expect(mockModerate).toHaveBeenCalledWith({
      input: expect.objectContaining({ pod_title: 'New title' }),
    });
    expect(mockRequest).toHaveBeenCalledWith(
      HostUpdatePodDocument,
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
    expect(mockModerate).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('surfaces a server failure and a non-Error rejection', async () => {
    mockSave.mockRejectedValueOnce(new Error('FORBIDDEN'));
    renderWithProviders(<PodEditDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    fireEvent.press(screen.getByTestId('pod-edit-save'));
    await waitFor(() => expect(screen.getByTestId('pod-edit-error')).toBeOnTheScreen());
    expect(screen.getByText('FORBIDDEN')).toBeOnTheScreen();

    // A bare string rejection is still a message worth showing as-is…
    mockSave.mockRejectedValueOnce('nope');
    fireEvent.press(screen.getByTestId('pod-edit-save'));
    await waitFor(() => expect(screen.getByText('nope')).toBeOnTheScreen());

    // …while a rejection with nothing readable falls back to the generic line.
    mockSave.mockRejectedValueOnce({ code: 500 });
    fireEvent.press(screen.getByTestId('pod-edit-save'));
    await waitFor(() => expect(screen.getByText('Could not save the pod')).toBeOnTheScreen());
  });

  it('locks the dialog while the save is in flight', async () => {
    const onClose = jest.fn();
    const onSaved = jest.fn();
    let resolve!: (value: unknown) => void;
    mockSave.mockReturnValue(
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
    expect(saveCalls()).toHaveLength(1);
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

  // The card caps its height at 86%, but RN defaults flexShrink to 0, so ANY
  // view between the card and the ScrollView sizes to its full content and
  // spills the upload box and the buttons onto the backdrop outside the card.
  // jest runs no layout pass, so these assert the structure that makes the
  // overflow impossible rather than the pixels.
  describe('layout contract', () => {
    it('puts no unshrinkable wrapper between the capped card and the scroller', () => {
      renderWithProviders(<PodEditDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
      expect(screen.UNSAFE_queryAllByType(SafeAreaView)).toHaveLength(0);
    });

    it('keeps the action buttons outside the scroller so they stay pinned', () => {
      renderWithProviders(<PodEditDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
      let node = screen.getByTestId('pod-edit-save').parent;
      const crossed: string[] = [];
      while (node) {
        if (typeof node.type === 'string') crossed.push(node.type);
        node = node.parent;
      }
      expect(crossed).not.toContain('RCTScrollView');
    });
  });
});
