import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ReelUploadField } from '@/components/create-pod/ReelUploadField';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { compressUploadedVideo } from '@/services/video-compression';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@/services/imagekit-upload', () => ({ uploadToImagekitDirect: jest.fn() }));
jest.mock('@/services/video-compression', () => ({ compressUploadedVideo: jest.fn() }));

const mockPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockLaunch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockUpload = uploadToImagekitDirect as jest.Mock;
const mockCompress = compressUploadedVideo as jest.Mock;

const picked = (over: Record<string, unknown> = {}) => ({
  canceled: false,
  assets: [
    {
      uri: 'file://reel.mp4',
      fileName: 'reel.mp4',
      mimeType: 'video/mp4',
      fileSize: 5 * 1024 * 1024,
      ...over,
    },
  ],
});

function Harness({ initial = '' }: Readonly<{ initial?: string }>) {
  const [value, setValue] = useState(initial);
  return <ReelUploadField value={value} onChange={setValue} />;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPermission.mockResolvedValue({ granted: true });
  mockLaunch.mockResolvedValue(picked());
  mockUpload.mockResolvedValue('https://cdn/pods/reels/reel.mp4');
  // The FFmpeg pass is a passthrough by default (compression off server-side).
  mockCompress.mockImplementation(async (url: string) => url);
});

const openPanel = () => fireEvent.press(screen.getByTestId('optional-reel'));

describe('ReelUploadField', () => {
  it('expands and collapses like the other optional accordions', () => {
    renderWithProviders(<Harness />);
    expect(screen.queryByTestId('reel-upload-add')).toBeNull();
    openPanel();
    expect(screen.getByTestId('reel-upload-add')).toBeOnTheScreen();
    expect(screen.getByText(/plays in the Explore feed/)).toBeOnTheScreen();
    openPanel();
    expect(screen.queryByTestId('reel-upload-add')).toBeNull();
  });

  it('picks a video (no base64) and uploads it straight to ImageKit', async () => {
    renderWithProviders(<Harness />);
    openPanel();
    fireEvent.press(screen.getByTestId('reel-upload-add'));
    await screen.findByTestId('reel-preview');
    // Videos only, streamed multipart — never base64 through the API.
    expect(mockLaunch).toHaveBeenCalledWith({ mediaTypes: ['videos'] });
    expect(mockUpload).toHaveBeenCalledWith(
      { uri: 'file://reel.mp4', name: 'reel.mp4', type: 'video/mp4' },
      '/pods/reels',
      expect.any(Function),
    );
    // The uploaded URL then goes through the server-side FFmpeg pass.
    expect(mockCompress).toHaveBeenCalledWith(
      'https://cdn/pods/reels/reel.mp4',
      '/pods/reels',
      expect.any(Function),
    );
    // The preview row shows the hosted file name; the header reads "Added".
    expect(screen.getByText('reel.mp4')).toBeOnTheScreen();
    expect(screen.getByText('Added')).toBeOnTheScreen();
    expect(screen.queryByTestId('reel-upload-add')).toBeNull();
  });

  it('removes the picked reel from the preview row', async () => {
    renderWithProviders(<Harness initial="https://cdn/pods/reels/old.mp4" />);
    openPanel();
    expect(screen.getByText('old.mp4')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('reel-remove'));
    await screen.findByTestId('reel-upload-add');
    expect(screen.queryByTestId('reel-preview')).toBeNull();
  });

  it('surfaces a denied media permission', async () => {
    mockPermission.mockResolvedValue({ granted: false });
    renderWithProviders(<Harness />);
    openPanel();
    fireEvent.press(screen.getByTestId('reel-upload-add'));
    await screen.findByTestId('reel-upload-error');
    expect(screen.getByTestId('reel-upload-error')).toHaveTextContent(/media access/i);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('is a no-op when the picker is cancelled', async () => {
    mockLaunch.mockResolvedValue({ canceled: true, assets: null });
    renderWithProviders(<Harness />);
    openPanel();
    fireEvent.press(screen.getByTestId('reel-upload-add'));
    await waitFor(() => expect(mockLaunch).toHaveBeenCalled());
    expect(mockUpload).not.toHaveBeenCalled();
    expect(screen.queryByTestId('reel-upload-error')).toBeNull();
  });

  it('rejects videos over the 100MB cap with a friendly inline error', async () => {
    mockLaunch.mockResolvedValue(picked({ fileSize: 101 * 1024 * 1024 }));
    renderWithProviders(<Harness />);
    openPanel();
    fireEvent.press(screen.getByTestId('reel-upload-add'));
    await screen.findByTestId('reel-upload-error');
    expect(screen.getByTestId('reel-upload-error')).toHaveTextContent(/over 100MB/);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('skips the size check when fileSize is missing and defaults name/type', async () => {
    mockLaunch.mockResolvedValue(
      picked({ fileSize: undefined, fileName: null, mimeType: undefined }),
    );
    renderWithProviders(<Harness />);
    openPanel();
    fireEvent.press(screen.getByTestId('reel-upload-add'));
    await screen.findByTestId('reel-preview');
    expect(mockUpload.mock.calls[0]?.[0].name).toMatch(/^reel-\d+\.mp4$/);
    expect(mockUpload.mock.calls[0]?.[0].type).toBe('video/mp4');
    expect(mockUpload.mock.calls[0]?.[1]).toBe('/pods/reels');
  });

  it('shows the uploading state and ignores taps while in flight', async () => {
    let release: (url: string) => void = () => undefined;
    mockUpload.mockReturnValue(
      new Promise<string>((resolve) => {
        release = resolve;
      }),
    );
    renderWithProviders(<Harness />);
    openPanel();
    fireEvent.press(screen.getByTestId('reel-upload-add'));
    await screen.findByText('Uploading…');
    // While uploading, the pick button is inert — no second picker launch.
    fireEvent.press(screen.getByTestId('reel-upload-add'));
    expect(mockLaunch).toHaveBeenCalledTimes(1);
    release('https://cdn/pods/reels/reel.mp4');
    await screen.findByTestId('reel-preview');
  });

  it('shows the real upload percentage, then the compression percentage', async () => {
    let releaseUpload: (url: string) => void = () => undefined;
    let uploadPct: ((pct: number) => void) | undefined;
    mockUpload.mockImplementation((_file, _folder, onPct) => {
      uploadPct = onPct;
      return new Promise<string>((resolve) => {
        releaseUpload = resolve;
      });
    });
    let releaseCompress: (url: string) => void = () => undefined;
    let compressPct: ((pct: number) => void) | undefined;
    mockCompress.mockImplementation((_url, _folder, onPct) => {
      compressPct = onPct;
      return new Promise<string>((resolve) => {
        releaseCompress = resolve;
      });
    });

    renderWithProviders(<Harness />);
    openPanel();
    fireEvent.press(screen.getByTestId('reel-upload-add'));
    await screen.findByText('Uploading…');
    act(() => uploadPct?.(40));
    await screen.findByText('Uploading… 40%');
    act(() => releaseUpload('https://cdn/pods/reels/raw.mp4'));
    await screen.findByText('Compressing… 0%');
    act(() => compressPct?.(15));
    await screen.findByText('Compressing… 15%');
    act(() => releaseCompress('https://cdn/pods/reels/small.mp4'));
    await screen.findByTestId('reel-preview');
    expect(screen.getByText('small.mp4')).toBeOnTheScreen();
  });

  it('reports Error and non-Error upload failures', async () => {
    mockUpload.mockRejectedValueOnce(new Error('ImageKit down'));
    renderWithProviders(<Harness />);
    openPanel();
    fireEvent.press(screen.getByTestId('reel-upload-add'));
    await screen.findByTestId('reel-upload-error');
    expect(screen.getByTestId('reel-upload-error')).toHaveTextContent('ImageKit down');
    mockUpload.mockRejectedValueOnce('nope');
    fireEvent.press(screen.getByTestId('reel-upload-add'));
    await waitFor(() =>
      expect(screen.getByTestId('reel-upload-error')).toHaveTextContent('Upload failed'),
    );
  });
});
