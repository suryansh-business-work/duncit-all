import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoverUploader } from '../../components/CoverUploader';
import { uploadImage } from '../../lib/upload';
import { captureNotifications, renderWithProviders } from '../test-utils';

vi.mock('../../lib/upload', () => ({ uploadImage: vi.fn() }));

let toasts: ReturnType<typeof captureNotifications>;

beforeEach(() => {
  toasts = captureNotifications();
});

afterEach(() => {
  toasts.stop();
  vi.clearAllMocks();
});

const picture = () => new File(['png-bytes'], 'roof.png', { type: 'image/png' });

/** The uploader as a form holds it: the value lives in the parent. */
function Holder({ initial = '', onChange, shape }: Readonly<{ initial?: string; onChange?: (url: string) => void; shape?: 'cover' | 'square' | 'avatar' }>) {
  const [value, setValue] = useState(initial);
  return (
    <CoverUploader
      label="Cover picture"
      value={value}
      shape={shape}
      onChange={(url) => {
        setValue(url);
        onChange?.(url);
      }}
    />
  );
}

const fileInput = () => screen.getByLabelText('Cover picture', { selector: 'input[type="file"]' });

describe('CoverUploader', () => {
  it('offers a picture from the device or a pasted link, with no preview while empty', () => {
    renderWithProviders(<Holder />);
    expect(screen.getByRole('button', { name: 'Choose a picture' })).toBeEnabled();
    expect(fileInput()).toHaveAttribute('accept', 'image/*');
    expect(screen.getByRole('textbox', { name: 'Or paste an image link' })).toHaveValue('');
    expect(screen.getByText('JPEG, PNG, WebP, GIF or AVIF')).toBeInTheDocument();
    expect(screen.queryByTestId('cover-uploader-preview')).not.toBeInTheDocument();
  });

  it('opens the device picker from the button', async () => {
    const { user } = renderWithProviders(<Holder />);
    const click = vi.spyOn(fileInput(), 'click');
    await user.click(screen.getByRole('button', { name: 'Choose a picture' }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('uploads the chosen picture and shows it', async () => {
    vi.mocked(uploadImage).mockResolvedValue('https://cdn.example/roof.png');
    const onChange = vi.fn();
    renderWithProviders(<Holder onChange={onChange} />);
    const file = picture();
    fireEvent.change(fileInput(), { target: { files: [file] } });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://cdn.example/roof.png'));
    expect(uploadImage).toHaveBeenCalledWith(file);
    expect(screen.getByTestId('cover-uploader-preview')).toHaveAttribute('src', 'https://cdn.example/roof.png');
    expect(screen.getByRole('textbox', { name: 'Or paste an image link' })).toHaveValue('https://cdn.example/roof.png');
  });

  it('holds the button busy while the upload runs', async () => {
    let finish: (url: string) => void = () => undefined;
    vi.mocked(uploadImage).mockReturnValue(
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
    );
    renderWithProviders(<Holder />);
    fireEvent.change(fileInput(), { target: { files: [picture()] } });
    await waitFor(() => expect(screen.getByTestId('cover-uploader-pick')).toBeDisabled());
    finish('https://cdn.example/roof.png');
    await waitFor(() => expect(screen.getByTestId('cover-uploader-pick')).toBeEnabled());
  });

  it('says why an upload was refused and keeps the old picture', async () => {
    vi.mocked(uploadImage).mockRejectedValue(new Error('That file is larger than 5 MB'));
    const onChange = vi.fn();
    renderWithProviders(<Holder initial="https://cdn.example/old.png" onChange={onChange} />);
    fireEvent.change(fileInput(), { target: { files: [picture()] } });

    await waitFor(() => expect(toasts.seen).toContainEqual({ message: 'That file is larger than 5 MB', severity: 'error' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('cover-uploader-preview')).toHaveAttribute('src', 'https://cdn.example/old.png');
    await waitFor(() => expect(screen.getByTestId('cover-uploader-pick')).toBeEnabled());
  });

  it('falls back to its own message when the refusal has none', async () => {
    vi.mocked(uploadImage).mockRejectedValue({});
    renderWithProviders(<Holder />);
    fireEvent.change(fileInput(), { target: { files: [picture()] } });
    await waitFor(() => expect(toasts.seen).toContainEqual({ message: 'The picture could not be uploaded.', severity: 'error' }));
  });

  it('does nothing when the picker is closed without a file', () => {
    renderWithProviders(<Holder />);
    fireEvent.change(fileInput(), { target: { files: [] } });
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('removes the picture', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(<Holder initial="https://cdn.example/old.png" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Remove picture' }));
    expect(onChange).toHaveBeenCalledWith('');
    expect(screen.queryByTestId('cover-uploader-preview')).not.toBeInTheDocument();
  });

  it('takes a pasted link as typed', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(<Holder onChange={onChange} />);
    await user.type(screen.getByRole('textbox', { name: 'Or paste an image link' }), 'https://a.example/p.jpg');
    expect(onChange).toHaveBeenLastCalledWith('https://a.example/p.jpg');
  });

  it('shows the caller’s hint under the link box', () => {
    renderWithProviders(<CoverUploader label="Avatar" value="" onChange={vi.fn()} hint="Square pictures look best" />);
    expect(screen.getByRole('textbox', { name: 'Or paste an image link' })).toHaveAccessibleDescription('Square pictures look best');
  });

  it('shows an error in place of the hint and marks the box invalid', () => {
    renderWithProviders(<CoverUploader label="Avatar" value="" onChange={vi.fn()} hint="Square pictures look best" error="Enter a full link" />);
    const box = screen.getByRole('textbox', { name: 'Or paste an image link' });
    expect(box).toHaveAccessibleDescription('Enter a full link');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Square pictures look best')).not.toBeInTheDocument();
  });

  it('reserves the preview at the shape’s size', () => {
    renderWithProviders(<Holder initial="https://cdn.example/me.png" shape="avatar" />);
    const preview = screen.getByTestId('cover-uploader-preview');
    expect(preview).toHaveAttribute('width', '160');
    expect(preview).toHaveAttribute('height', '160');
  });
});
