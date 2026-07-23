import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { MediaUploadField } from '@/components/create-pod/MediaUploadField';
import { renderWithProviders } from '@/utils/test-utils';

const mockPick = jest.fn();
let mockUploading = false;
let mockError: string | undefined;
let mockUploadUrl: string | null = 'https://cdn/new.jpg';
jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: (_folder: string, onUploaded: (url: string) => void) => {
    mockPick.mockImplementation(() => {
      if (mockUploadUrl) onUploaded(mockUploadUrl);
    });
    return {
      uploading: mockUploading,
      error: mockError,
      pending: null,
      stage: 'processing' as const,
      progress: null,
      pick: mockPick,
      confirm: jest.fn(),
      cancel: jest.fn(),
    };
  },
}));
let mockSettings: unknown = null;
jest.mock('@/hooks/useUploadSettings', () => ({ useUploadSettings: () => mockSettings }));

function Harness({ initial = '' }: Readonly<{ initial?: string }>) {
  const [value, setValue] = useState(initial);
  return <MediaUploadField value={value} onChange={setValue} />;
}

beforeEach(() => {
  mockPick.mockClear();
  mockUploading = false;
  mockError = undefined;
  mockUploadUrl = 'https://cdn/new.jpg';
  mockSettings = null;
});

describe('MediaUploadField', () => {
  it('picks from the library and appends the uploaded URL as a thumbnail', async () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('media-upload-add'));
    await waitFor(() =>
      expect(screen.getByTestId('media-thumb-https://cdn/new.jpg')).toBeOnTheScreen(),
    );
  });

  it('ignores a cancelled pick', () => {
    mockUploadUrl = null;
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('media-upload-add'));
    expect(screen.queryByTestId(/media-thumb-/)).toBeNull();
  });

  it('renders video + image thumbs and removes one', () => {
    renderWithProviders(<Harness initial={'https://cdn/a.jpg\nhttps://cdn/b.mp4'} />);
    expect(screen.getByTestId('media-thumb-https://cdn/b.mp4')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('media-remove-https://cdn/a.jpg'));
    expect(screen.queryByTestId('media-thumb-https://cdn/a.jpg')).toBeNull();
  });

  it('shows upload-error and validation-error states and inerts the add button while uploading', () => {
    mockUploading = true;
    mockError = 'Upload failed';
    renderWithProviders(
      <MediaUploadField value="" onChange={jest.fn()} error="Add at least one image URL" />,
    );
    expect(screen.getByTestId('media-upload-error')).toBeOnTheScreen();
    expect(screen.getByTestId('media_text-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('media-upload-add'));
    expect(mockPick).not.toHaveBeenCalled();
  });

  it('shows a settings-driven format + size hint when settings are loaded', () => {
    mockSettings = {
      allowed_image_formats: ['jpg', 'png'],
      max_image_mb: 10,
      max_video_mb: 100,
      allowed_video_formats: ['mp4'],
      default_crop_key: 'NO_CROP',
      crop_presets: [],
    };
    renderWithProviders(<Harness />);
    expect(screen.getByText(/JPG, PNG · up to 10 MB · crop after selecting/)).toBeOnTheScreen();
  });

  it('falls back to a neutral hint before settings load and tolerates an undefined value', () => {
    renderWithProviders(<MediaUploadField value={undefined as never} onChange={jest.fn()} />);
    expect(screen.getByTestId('media-upload-add')).toBeOnTheScreen();
    expect(screen.getByText('Crop after selecting')).toBeOnTheScreen();
  });

  it('renders a custom label when provided', () => {
    renderWithProviders(
      <MediaUploadField value="" onChange={jest.fn()} label="Pod Media" folder="/pod-completion" />,
    );
    expect(screen.getByText('Pod Media')).toBeOnTheScreen();
  });
});
