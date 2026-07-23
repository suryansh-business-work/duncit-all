import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- mock the media-picker workspace package the component depends on ----
const uploadMock = vi.fn();
const compressMock = vi.fn();
let uploadingState = false;

vi.mock('@duncit/media-picker', () => ({
  useImagekitDirectUpload: () => ({ upload: uploadMock, uploading: uploadingState }),
  compressUploadedVideo: (...args: unknown[]) => compressMock(...args),
}));

import PodReelAccordion from '../PodReelAccordion';
import { blankCreatePodForm } from '../../create-pod.types';

/** Harness: builds a real react-hook-form form and renders the accordion.
 * Exposes the form via a ref-callback so tests can read reel_url. */
function Harness({ initialReel = '', onForm }: { initialReel?: string; onForm?: (f: any) => void }) {
  const form = useForm({
    defaultValues: { ...blankCreatePodForm, reel_url: initialReel },
  });
  onForm?.(form);
  return <PodReelAccordion form={form as any} />;
}

function setup(initialReel = '') {
  let form: any;
  const utils = render(
    <MockedProvider mocks={[]}>
      <Harness initialReel={initialReel} onForm={(f) => (form = f)} />
    </MockedProvider>,
  );
  // The AccordionDetails (video + buttons) is aria-hidden until expanded.
  fireEvent.click(screen.getByRole('button', { name: /Pod Reel/ }));
  return { ...utils, getForm: () => form };
}

function makeFile(name: string, type: string, size: number) {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

beforeEach(() => {
  uploadMock.mockReset();
  compressMock.mockReset();
  uploadingState = false;
});

describe('PodReelAccordion', () => {
  it('renders the empty state: header, caption and Upload video button', () => {
    setup('');
    expect(screen.getByText('Pod Reel')).toBeInTheDocument();
    expect(screen.getByText(/Reel video shows in Explore/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload video/ })).toBeInTheDocument();
    // No "Added" chip, no video, no Remove button when there is no reel.
    expect(screen.queryByText('Added')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
  });

  it('renders the populated state: Added chip, video element, Replace + Remove', () => {
    setup('https://ik.example/reel.mp4');
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Replace video/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove/ })).toBeInTheDocument();
    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'https://ik.example/reel.mp4');
  });

  it('removes the reel when Remove is clicked', async () => {
    const { getForm } = setup('https://ik.example/reel.mp4');
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    await waitFor(() => expect(screen.queryByText('Added')).not.toBeInTheDocument());
    expect(getForm().getValues('reel_url')).toBe('');
  });

  it('rejects a non-video file with a validation error', async () => {
    setup('');
    fireEvent.change(fileInput(), {
      target: { files: [makeFile('note.txt', 'text/plain', 1000)] },
    });
    expect(await screen.findByText('Please pick a video file (MP4, MOV or WebM)')).toBeInTheDocument();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('rejects a file larger than 100 MB', async () => {
    setup('');
    fireEvent.change(fileInput(), {
      target: { files: [makeFile('big.mp4', 'video/mp4', 200 * 1024 * 1024)] },
    });
    expect(await screen.findByText('Video is too large (max 100 MB)')).toBeInTheDocument();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('dismisses the error chip via onDelete', async () => {
    setup('');
    fireEvent.change(fileInput(), {
      target: { files: [makeFile('note.txt', 'text/plain', 1000)] },
    });
    const err = await screen.findByText('Please pick a video file (MP4, MOV or WebM)');
    // The MUI Chip delete affordance is a CancelIcon with a button-ish role.
    const deleteIcon = err.parentElement?.querySelector('svg[data-testid="CancelIcon"]');
    fireEvent.click(deleteIcon as Element);
    await waitFor(() =>
      expect(screen.queryByText('Please pick a video file (MP4, MOV or WebM)')).not.toBeInTheDocument(),
    );
  });

  it('does nothing when no file is selected', () => {
    setup('');
    fireEvent.change(fileInput(), { target: { files: [] } });
    expect(uploadMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/too large/)).not.toBeInTheDocument();
  });

  it('uploads a valid video, shows progress, then compresses and stores the url', async () => {
    // upload reports byte progress then resolves the raw url.
    uploadMock.mockImplementation(async (_file: File, _folder: string, onPct: (n: number) => void) => {
      onPct(42);
      return 'https://ik.example/raw.mp4';
    });
    compressMock.mockImplementation(async (..._args: unknown[]) => 'https://ik.example/final.mp4');

    const { getForm } = setup('');
    fireEvent.change(fileInput(), {
      target: { files: [makeFile('clip.mp4', 'video/mp4', 5 * 1024 * 1024)] },
    });

    await waitFor(() => expect(getForm().getValues('reel_url')).toBe('https://ik.example/final.mp4'));
    expect(uploadMock).toHaveBeenCalledWith(
      expect.any(File),
      '/pods/reels',
      expect.any(Function),
    );
    expect(compressMock).toHaveBeenCalledWith(
      expect.anything(),
      'https://ik.example/raw.mp4',
      '/pods/reels',
      'MWEB',
      expect.any(Function),
    );
    // After success the populated UI (video + Added chip) is shown.
    expect(await screen.findByText('Added')).toBeInTheDocument();
  });

  it('accepts a video detected by extension even without a video/ mime type', async () => {
    uploadMock.mockResolvedValue('https://ik.example/raw.mov');
    compressMock.mockResolvedValue('https://ik.example/final.mov');
    const { getForm } = setup('');
    fireEvent.change(fileInput(), {
      target: { files: [makeFile('clip.MOV', '', 1024)] },
    });
    await waitFor(() => expect(getForm().getValues('reel_url')).toBe('https://ik.example/final.mov'));
  });

  it('surfaces the upload error message when upload rejects', async () => {
    uploadMock.mockRejectedValue(new Error('Network down'));
    setup('');
    fireEvent.change(fileInput(), {
      target: { files: [makeFile('clip.mp4', 'video/mp4', 1024)] },
    });
    expect(await screen.findByText('Network down')).toBeInTheDocument();
  });

  it('falls back to a generic message when the error has no message', async () => {
    uploadMock.mockRejectedValue({});
    setup('');
    fireEvent.change(fileInput(), {
      target: { files: [makeFile('clip.mp4', 'video/mp4', 1024)] },
    });
    expect(await screen.findByText('Upload failed')).toBeInTheDocument();
  });

  it('keeps the url empty when compression returns nothing', async () => {
    uploadMock.mockResolvedValue('https://ik.example/raw.mp4');
    compressMock.mockResolvedValue('');
    const { getForm } = setup('');
    fireEvent.change(fileInput(), {
      target: { files: [makeFile('clip.mp4', 'video/mp4', 1024)] },
    });
    await waitFor(() => expect(compressMock).toHaveBeenCalled());
    expect(getForm().getValues('reel_url')).toBe('');
  });

  it('disables the upload button and shows a busy label while uploading', () => {
    uploadingState = true;
    setup('');
    const btn = screen.getByRole('button', { name: /Uploading/ });
    expect(btn).toBeDisabled();
  });
});
