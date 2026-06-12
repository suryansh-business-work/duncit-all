import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { MediaUploadField } from '@/components/create-pod/MediaUploadField';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useMediaUpload', () => ({ useMediaUpload: jest.fn() }));
const mockedUpload = useMediaUpload as jest.Mock;

function Harness({ initial = '' }: Readonly<{ initial?: string }>) {
  const [value, setValue] = useState(initial);
  return <MediaUploadField value={value} onChange={setValue} />;
}

const api = (over: Record<string, unknown> = {}) => ({
  uploading: false,
  error: undefined,
  pickAndUpload: jest.fn().mockResolvedValue('https://cdn/new.jpg'),
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('MediaUploadField', () => {
  it('uploads from the library and appends the URL as a thumbnail', async () => {
    mockedUpload.mockReturnValue(api());
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('media-upload-add'));
    await waitFor(() =>
      expect(screen.getByTestId('media-thumb-https://cdn/new.jpg')).toBeOnTheScreen(),
    );
  });

  it('ignores a cancelled upload', async () => {
    const hook = api({ pickAndUpload: jest.fn().mockResolvedValue(null) });
    mockedUpload.mockReturnValue(hook);
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('media-upload-add'));
    await waitFor(() => expect(hook.pickAndUpload).toHaveBeenCalled());
    expect(screen.queryByTestId(/media-thumb-/)).toBeNull();
  });

  it('renders video + image thumbs and removes one', () => {
    mockedUpload.mockReturnValue(api());
    renderWithProviders(<Harness initial={'https://cdn/a.jpg\nhttps://cdn/b.mp4'} />);
    expect(screen.getByTestId('media-thumb-https://cdn/b.mp4')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('media-remove-https://cdn/a.jpg'));
    expect(screen.queryByTestId('media-thumb-https://cdn/a.jpg')).toBeNull();
  });

  it('shows uploading, upload-error and validation-error states', () => {
    mockedUpload.mockReturnValue(api({ uploading: true, error: 'Upload failed' }));
    renderWithProviders(
      <MediaUploadField value="" onChange={jest.fn()} error="Add at least one image URL" />,
    );
    expect(screen.getByText('Uploading…')).toBeOnTheScreen();
    expect(screen.getByTestId('media-upload-error')).toBeOnTheScreen();
    expect(screen.getByTestId('media_text-error')).toBeOnTheScreen();
    // While uploading, the add button is inert.
    fireEvent.press(screen.getByTestId('media-upload-add'));
  });

  it('tolerates an undefined form value', () => {
    mockedUpload.mockReturnValue(api());
    renderWithProviders(<MediaUploadField value={undefined as never} onChange={jest.fn()} />);
    expect(screen.getByTestId('field-media_text')).toBeOnTheScreen();
  });

  it('accepts pasted URLs through the text box', () => {
    mockedUpload.mockReturnValue(api());
    renderWithProviders(<Harness />);
    fireEvent.changeText(screen.getByTestId('field-media_text'), 'https://cdn/p.jpg');
    expect(screen.getByTestId('media-thumb-https://cdn/p.jpg')).toBeOnTheScreen();
  });
});
