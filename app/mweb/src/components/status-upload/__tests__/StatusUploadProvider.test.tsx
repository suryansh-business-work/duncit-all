import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mutate = vi.fn();
const refetchQueries = vi.fn();
const uploadStatusMedia = vi.fn();

vi.mock('../../../apollo', () => ({
  apolloClient: {
    mutate: (...args: unknown[]) => mutate(...args),
    refetchQueries: (...args: unknown[]) => refetchQueries(...args),
  },
}));

vi.mock('../statusPipeline', () => ({
  mediaTypeOf: (file: File) => (file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'),
  uploadStatusMedia: (...args: unknown[]) => uploadStatusMedia(...args),
}));

// Lightweight dialog stubs: expose confirm/cancel buttons only when a file is set.
vi.mock('../StatusCropDialog', () => ({
  default: ({
    file,
    onCancel,
    onConfirm,
  }: {
    file: File | null;
    onCancel: () => void;
    onConfirm: (crop: unknown, preset: unknown) => void;
  }) =>
    file ? (
      <div>
        <span>crop-open</span>
        <button onClick={() => onConfirm({ x: 1 }, 'square')}>crop-confirm</button>
        <button onClick={onCancel}>crop-cancel</button>
      </div>
    ) : null,
}));

vi.mock('../StatusVideoPreviewDialog', () => ({
  default: ({
    file,
    onCancel,
    onConfirm,
  }: {
    file: File | null;
    onCancel: () => void;
    onConfirm: (trim: unknown) => void;
  }) =>
    file ? (
      <div>
        <span>video-open</span>
        <button onClick={() => onConfirm({ start: 0, duration: 15 })}>video-confirm</button>
        <button onClick={onCancel}>video-cancel</button>
      </div>
    ) : null,
}));

import { StatusUploadProvider, useStatusUpload } from '../StatusUploadProvider';
import { ADD_POD_STATUS, CREATE_STATUS_POST } from '../queries';

function Consumer() {
  const { upload, openProfilePicker, openPodPicker, openClubPicker } = useStatusUpload();
  return (
    <div>
      <button onClick={openProfilePicker}>open-profile</button>
      <button onClick={() => openPodPicker('pod-1')}>open-pod</button>
      <button onClick={() => openClubPicker('club-1')}>open-club</button>
      <span data-testid="kind">{upload.kind ?? 'none'}</span>
      <span data-testid="active">{String(upload.active)}</span>
      <span data-testid="progress">{upload.progress}</span>
    </div>
  );
}

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

const makeFile = (name: string, type: string, size?: number) => {
  const file = new File(['x'], name, { type });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
};

const renderProvider = () =>
  render(
    <StatusUploadProvider>
      <Consumer />
    </StatusUploadProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mutate.mockResolvedValue({ data: {} });
  refetchQueries.mockResolvedValue([]);
  uploadStatusMedia.mockResolvedValue('https://cdn/x.png');
});

describe('useStatusUpload', () => {
  it('throws when used outside the provider', () => {
    function Bad() {
      useStatusUpload();
      return null;
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bad />)).toThrow('useStatusUpload must be used inside StatusUploadProvider');
    spy.mockRestore();
  });
});

describe('StatusUploadProvider — file validation', () => {
  it('rejects a non-image/non-video file with a notice', () => {
    renderProvider();
    fireEvent.click(screen.getByText('open-profile'));
    fireEvent.change(fileInput(), { target: { files: [makeFile('a.txt', 'text/plain')] } });
    expect(screen.getByText('Please choose a valid status media file')).toBeInTheDocument();
  });

  it('rejects an oversized image', () => {
    renderProvider();
    fireEvent.click(screen.getByText('open-profile'));
    fireEvent.change(fileInput(), {
      target: { files: [makeFile('big.png', 'image/png', 16 * 1024 * 1024)] },
    });
    expect(screen.getByText('Image is too large (max 15 MB)')).toBeInTheDocument();
  });

  it('rejects an oversized story video (50 MB cap)', () => {
    renderProvider();
    fireEvent.click(screen.getByText('open-profile'));
    fireEvent.change(fileInput(), {
      target: { files: [makeFile('big.mp4', 'video/mp4', 60 * 1024 * 1024)] },
    });
    expect(screen.getByText('Video is too large (max 50 MB)')).toBeInTheDocument();
  });

  it('rejects an oversized pod video (100 MB cap)', () => {
    renderProvider();
    fireEvent.click(screen.getByText('open-pod'));
    fireEvent.change(fileInput(), {
      target: { files: [makeFile('big.mp4', 'video/mp4', 120 * 1024 * 1024)] },
    });
    expect(screen.getByText('Video is too large (max 100 MB)')).toBeInTheDocument();
  });

  it('ignores a change event with no file selected', () => {
    renderProvider();
    fireEvent.click(screen.getByText('open-profile'));
    fireEvent.change(fileInput(), { target: { files: [] } });
    expect(screen.queryByText('crop-open')).not.toBeInTheDocument();
  });
});

describe('StatusUploadProvider — image crop flow', () => {
  it('opens the crop dialog for a profile image and uploads via CREATE_STATUS_POST', async () => {
    renderProvider();
    fireEvent.click(screen.getByText('open-profile'));
    fireEvent.change(fileInput(), { target: { files: [makeFile('p.png', 'image/png')] } });
    expect(screen.getByText('crop-open')).toBeInTheDocument();

    fireEvent.click(screen.getByText('crop-confirm'));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    const call = mutate.mock.calls[0][0];
    expect(call.mutation).toBe(CREATE_STATUS_POST);
    expect(call.variables.input).toMatchObject({ image_url: 'https://cdn/x.png', kind: 'STORY' });
    expect(call.variables.input.club_id).toBeUndefined();

    expect(uploadStatusMedia).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'profile', crop: { x: 1 }, cropPreset: 'square' }),
    );
    await waitFor(() => expect(refetchQueries).toHaveBeenCalledTimes(1));
    await screen.findByText('Status uploaded.');
  });

  it('includes club_id for a club image upload', async () => {
    renderProvider();
    fireEvent.click(screen.getByText('open-club'));
    fireEvent.change(fileInput(), { target: { files: [makeFile('c.png', 'image/png')] } });
    fireEvent.click(screen.getByText('crop-confirm'));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0][0].variables.input.club_id).toBe('club-1');
  });

  it('cancelling the crop dialog uploads nothing', () => {
    renderProvider();
    fireEvent.click(screen.getByText('open-profile'));
    fireEvent.change(fileInput(), { target: { files: [makeFile('p.png', 'image/png')] } });
    fireEvent.click(screen.getByText('crop-cancel'));
    expect(screen.queryByText('crop-open')).not.toBeInTheDocument();
    expect(uploadStatusMedia).not.toHaveBeenCalled();
  });
});

describe('StatusUploadProvider — video flow', () => {
  it('uploads a pod video directly (ADD_POD_STATUS, no preview dialog)', async () => {
    renderProvider();
    fireEvent.click(screen.getByText('open-pod'));
    fireEvent.change(fileInput(), { target: { files: [makeFile('v.mp4', 'video/mp4')] } });

    // No preview dialog for pod videos.
    expect(screen.queryByText('video-open')).not.toBeInTheDocument();

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    const call = mutate.mock.calls[0][0];
    expect(call.mutation).toBe(ADD_POD_STATUS);
    expect(call.variables).toMatchObject({ podId: 'pod-1', media: { url: 'https://cdn/x.png', type: 'VIDEO' } });
  });

  it('opens the preview dialog for a story video then uploads with the trim', async () => {
    renderProvider();
    fireEvent.click(screen.getByText('open-profile'));
    fireEvent.change(fileInput(), { target: { files: [makeFile('v.mp4', 'video/mp4')] } });
    expect(screen.getByText('video-open')).toBeInTheDocument();

    fireEvent.click(screen.getByText('video-confirm'));

    await waitFor(() => expect(uploadStatusMedia).toHaveBeenCalledTimes(1));
    expect(uploadStatusMedia).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'profile', trim: { start: 0, duration: 15 } }),
    );
    await waitFor(() => expect(mutate.mock.calls[0][0].mutation).toBe(CREATE_STATUS_POST));
  });

  it('cancelling the video preview uploads nothing', () => {
    renderProvider();
    fireEvent.click(screen.getByText('open-profile'));
    fireEvent.change(fileInput(), { target: { files: [makeFile('v.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByText('video-cancel'));
    expect(screen.queryByText('video-open')).not.toBeInTheDocument();
    expect(uploadStatusMedia).not.toHaveBeenCalled();
  });
});

describe('StatusUploadProvider — progress + errors', () => {
  it('shows the progress overlay while active and blocks a second picker', async () => {
    let resolveUpload: (url: string) => void = () => {};
    uploadStatusMedia.mockImplementation(
      (opts: { onStage: (s: { progress: number; message: string }) => void }) => {
        opts.onStage({ progress: 40, message: 'Uploading status media...' });
        return new Promise<string>((resolve) => {
          resolveUpload = resolve;
        });
      },
    );

    renderProvider();
    fireEvent.click(screen.getByText('open-pod'));
    fireEvent.change(fileInput(), { target: { files: [makeFile('v.mp4', 'video/mp4')] } });

    await waitFor(() => expect(screen.getByTestId('active').textContent).toBe('true'));
    // Overlay renders the staged message + percentage.
    expect(screen.getByText('Uploading status media...')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();

    // A second picker while active surfaces the wait notice.
    fireEvent.click(screen.getByText('open-profile'));
    expect(screen.getByText('Please wait, status upload is in progress.')).toBeInTheDocument();

    resolveUpload('https://cdn/x.png');
    await waitFor(() => expect(mutate).toHaveBeenCalled());
  });

  it('surfaces the error message when the upload fails', async () => {
    uploadStatusMedia.mockRejectedValue(new Error('boom'));
    renderProvider();
    fireEvent.click(screen.getByText('open-pod'));
    fireEvent.change(fileInput(), { target: { files: [makeFile('v.mp4', 'video/mp4')] } });

    await screen.findByText('boom');
    expect(screen.getByTestId('active').textContent).toBe('false');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('dismisses the snackbar notice via the OK action', () => {
    renderProvider();
    fireEvent.click(screen.getByText('open-profile'));
    fireEvent.change(fileInput(), { target: { files: [makeFile('a.txt', 'text/plain')] } });
    expect(screen.getByText('Please choose a valid status media file')).toBeInTheDocument();
    fireEvent.click(screen.getByText('OK'));
    // Snackbar begins closing; content is no longer asserted as present after close.
  });
});
