import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { MB } from '@duncit/media-picker';
import MediaUploadField from '@/forms/fields/MediaUploadField';

const media = vi.hoisted(() => ({ upload: vi.fn() }));

// ImageKit is reached through the upload hook; everything else in the package is real.
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitBase64Upload: () => ({ upload: media.upload, uploading: false }),
}));

function ValueProbe() {
  const value = useWatch({ name: 'photos' }) as string | undefined;
  return <output data-testid="value">{JSON.stringify(value ?? null)}</output>;
}

function Harness({
  initial,
  kind,
  folder,
  helperText,
}: Readonly<{ initial?: string; kind: 'image' | 'video'; folder?: string; helperText?: string }>) {
  const methods = useForm<{ photos?: string }>({ defaultValues: initial === undefined ? {} : { photos: initial } });
  return (
    <FormProvider {...methods}>
      <form>
        <MediaUploadField name="photos" label="Venue Photos" kind={kind} folder={folder} helperText={helperText} />
        <ValueProbe />
      </form>
    </FormProvider>
  );
}

const renderField = (
  initial: string | undefined,
  kind: 'image' | 'video' = 'image',
  extra: { folder?: string; helperText?: string } = {}
) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <Harness initial={initial} kind={kind} {...extra} />
    </MockedProvider>
  );

const file = (name: string, type: string, sizeBytes = 1024) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: sizeBytes });
  return f;
};

const fileInput = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;
const pick = (input: HTMLInputElement, files: File[]) => fireEvent.change(input, { target: { files } });
const currentValue = () => JSON.parse(screen.getByTestId('value').textContent ?? 'null') as string | null;

describe('MediaUploadField', () => {
  beforeEach(() => {
    media.upload.mockReset();
  });

  it('renders an upload button and NO free-text URL input (no paste)', () => {
    renderField('');
    expect(screen.getByRole('button', { name: /Add images/i })).toBeTruthy();
    // Point 6: there must be no URL text field to paste into.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('renders a thumbnail per saved URL and removes one on click', () => {
    const { container } = renderField('https://ik.test/a.jpg\nhttps://ik.test/b.jpg');
    expect(container.querySelectorAll('img')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: /remove media/i })[0]);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(currentValue()).toBe('https://ik.test/b.jpg');
  });

  it('uses a hidden video file input for the video kind', () => {
    const { container } = renderField('https://ik.test/a.mp4', 'video');
    const input = fileInput(container);
    expect(input.accept).toBe('video/*');
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Add videos/i })).toBeInTheDocument();
  });

  it('treats an unset form value as an empty list and shows the helper text', () => {
    const { container } = renderField(undefined, 'image', { helperText: 'Up to 10 photos' });
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(screen.getByText('Up to 10 photos')).toBeInTheDocument();
  });

  it('uploads every picked image, shows the busy state, then appends the URLs', async () => {
    let release: (v: { url: string }) => void = () => undefined;
    media.upload
      .mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }))
      .mockResolvedValueOnce({ url: 'https://ik.test/new-2.jpg' });
    const { container } = renderField('https://ik.test/a.jpg', 'image', { folder: 'crm/venues' });
    const input = fileInput(container);
    const first = file('one.png', 'image/png');
    const second = file('two.png', 'image/png');

    pick(input, [first, second]);

    const busyButton = await screen.findByRole('button', { name: /Uploading…/ });
    expect(busyButton).toBeDisabled();
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();

    release({ url: 'https://ik.test/new-1.jpg' });

    await waitFor(() =>
      expect(currentValue()).toBe('https://ik.test/a.jpg\nhttps://ik.test/new-1.jpg\nhttps://ik.test/new-2.jpg')
    );
    expect(media.upload).toHaveBeenNthCalledWith(1, first, { folder: 'crm/venues', fallbackMimeType: 'image/png' });
    expect(media.upload).toHaveBeenNthCalledWith(2, second, { folder: 'crm/venues', fallbackMimeType: 'image/png' });
    expect(screen.getByRole('button', { name: /Add images/i })).toBeEnabled();
    expect(container.querySelectorAll('img')).toHaveLength(3);
    expect(input.value).toBe('');
  });

  it('sends videos with the video fallback MIME type and the default folder', async () => {
    media.upload.mockResolvedValueOnce({ url: 'https://ik.test/clip.mp4' });
    const { container } = renderField('', 'video');
    const clip = file('clip.mov', 'video/quicktime', 50 * MB);

    pick(fileInput(container), [clip]);

    await waitFor(() => expect(currentValue()).toBe('https://ik.test/clip.mp4'));
    expect(media.upload).toHaveBeenCalledWith(clip, { folder: 'crm/media', fallbackMimeType: 'video/mp4' });
    expect(container.querySelectorAll('video')).toHaveLength(1);
  });

  it('skips a file over the image cap with a warning but still uploads the rest', async () => {
    media.upload.mockResolvedValueOnce({ url: 'https://ik.test/ok.jpg' });
    const { container } = renderField('');
    const big = file('huge.png', 'image/png', 16 * MB);
    const ok = file('ok.png', 'image/png');

    pick(fileInput(container), [big, ok]);

    expect(await screen.findByText('huge.png exceeds the 15 MB limit and was skipped.')).toBeInTheDocument();
    await waitFor(() => expect(currentValue()).toBe('https://ik.test/ok.jpg'));
    expect(media.upload).toHaveBeenCalledTimes(1);
    expect(media.upload).toHaveBeenCalledWith(ok, expect.anything());

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByText(/exceeds the 15 MB limit/)).not.toBeInTheDocument();
  });

  it('leaves the value untouched when the upload returns no URL', async () => {
    media.upload.mockResolvedValueOnce({ url: '' });
    const { container } = renderField('https://ik.test/a.jpg');

    pick(fileInput(container), [file('one.png', 'image/png')]);

    await waitFor(() => expect(media.upload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: /Add images/i })).toBeEnabled());
    expect(currentValue()).toBe('https://ik.test/a.jpg');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the parsed API error when an upload fails and keeps the saved list', async () => {
    media.upload.mockRejectedValueOnce(new Error('ImageKit rejected the file'));
    const { container } = renderField('https://ik.test/a.jpg');

    pick(fileInput(container), [file('one.png', 'image/png')]);

    expect(await screen.findByRole('alert')).toHaveTextContent('ImageKit rejected the file');
    expect(currentValue()).toBe('https://ik.test/a.jpg');
    expect(screen.getByRole('button', { name: /Add images/i })).toBeEnabled();
  });

  it('ignores an empty file selection', () => {
    const { container } = renderField('https://ik.test/a.jpg');
    pick(fileInput(container), []);
    expect(media.upload).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Add images/i })).toBeEnabled();
    expect(currentValue()).toBe('https://ik.test/a.jpg');
  });

  it('opens the native file picker from the upload button', () => {
    const { container } = renderField('');
    const clickSpy = vi.spyOn(fileInput(container), 'click');
    fireEvent.click(screen.getByRole('button', { name: /Add images/i }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
