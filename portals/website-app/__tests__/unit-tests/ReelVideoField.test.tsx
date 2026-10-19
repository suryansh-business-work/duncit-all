import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReelVideoField from '../../src/pages/website/reels/reel-form/ReelVideoField';
import { en } from '../en';

const upload = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({ uploading: false }));

vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitDirectUpload: () => ({ upload, uploading: state.uploading }),
}));

const MB = 1024 * 1024;

const mount = (props: Partial<Parameters<typeof ReelVideoField>[0]> = {}) => {
  const onUploaded = vi.fn();
  const view = render(<ReelVideoField value="" sizeBytes={0} maxMb={10} onUploaded={onUploaded} {...props} />);
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { onUploaded, input };
};

const pick = (input: HTMLInputElement, file: File) => fireEvent.change(input, { target: { files: [file] } });
const fileOf = (bytes: number, type: string, name = 'clip.mp4') => new File([new Uint8Array(bytes)], name, { type });

beforeEach(() => {
  upload.mockReset();
  state.uploading = false;
});

describe('ReelVideoField', () => {
  it('shows the size cap before a video is chosen, and the chosen video after', () => {
    const first = mount();
    expect(screen.getByText(en('websiteApp.reels.sizeHint', { max: 10 }))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en('websiteApp.reels.choose') })).toBeInTheDocument();
    first.input.remove();
    document.body.innerHTML = '';

    mount({ value: 'https://ik.test/a.mp4', sizeBytes: 3 * MB });
    expect(screen.getByText(en('websiteApp.reels.uploaded', { size: '3.0' }))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en('websiteApp.reels.replace') })).toBeInTheDocument();
  });

  it('opens the video picker from its button', () => {
    const { input } = mount();
    const openPicker = vi.spyOn(input, 'click').mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.reels.choose') }));
    expect(openPicker).toHaveBeenCalledTimes(1);
    expect(input).toHaveAttribute('accept', 'video/*');
  });

  it('refuses a file that is not a video without sending a byte', async () => {
    const { input, onUploaded } = mount();
    pick(input, fileOf(100, 'image/png', 'a.png'));
    expect(await screen.findByText(en('websiteApp.reels.notVideo'))).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it('refuses a video over the cap, naming both sizes', async () => {
    const { input } = mount({ maxMb: 1 });
    pick(input, fileOf(2 * MB, 'video/mp4'));
    expect(await screen.findByText(en('websiteApp.reels.tooLarge', { size: '2.0', max: 1 }))).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });

  it('hands the uploaded url and size to the form, reporting progress', async () => {
    upload.mockImplementation(async (_file: File, _folder: string, progress: (pct: number) => void) => {
      progress(40);
      return 'https://ik.test/website/reels/clip.mp4';
    });
    const { input, onUploaded } = mount();
    pick(input, fileOf(2 * MB, 'video/mp4'));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('https://ik.test/website/reels/clip.mp4', 2 * MB));
    expect(upload).toHaveBeenCalledWith(expect.any(File), '/website/reels', expect.any(Function));
  });

  it('reports a failed upload and clears an earlier problem on the next good pick', async () => {
    upload.mockRejectedValueOnce(new Error('ImageKit 500')).mockResolvedValueOnce('https://ik.test/ok.mp4');
    const { input, onUploaded } = mount();
    pick(input, fileOf(MB, 'video/mp4'));
    expect(await screen.findByText(en('websiteApp.reels.uploadFailed'))).toBeInTheDocument();
    expect(onUploaded).not.toHaveBeenCalled();

    pick(input, fileOf(MB, 'video/mp4'));
    await waitFor(() => expect(onUploaded).toHaveBeenCalled());
    expect(screen.queryByText(en('websiteApp.reels.uploadFailed'))).not.toBeInTheDocument();
  });

  it('ignores a cancelled picker, and shows a form error when nothing else is wrong', () => {
    const { input } = mount({ error: 'A video is required' });
    fireEvent.change(input, { target: { files: [] } });
    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('A video is required');
  });

  it('disables the button and shows progress while a file is going up', () => {
    state.uploading = true;
    mount({ value: 'https://ik.test/a.mp4' });
    expect(screen.getByRole('button', { name: en('websiteApp.reels.replace') })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(en('websiteApp.reels.uploading', { pct: 0 }));
  });
});
