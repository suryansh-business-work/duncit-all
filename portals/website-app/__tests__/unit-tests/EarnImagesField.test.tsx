import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logs } from '@duncit/logs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EarnImagesField from '../../src/pages/website/earn/earn-form/EarnImagesField';
import { EARN_LIMITS } from '../../src/pages/website/earn/earn-form';
import { en, label } from '../en';

const upload = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({ uploading: false }));

vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitDirectUpload: () => ({ upload, uploading: state.uploading }),
}));
const logError = vi.spyOn(logs.portal['website-app'], 'error').mockImplementation(() => undefined);

const image = (name: string, type = 'image/jpeg') => new File(['x'], name, { type });

const mount = (props: Partial<Parameters<typeof EarnImagesField>[0]> = {}) => {
  const onChange = vi.fn();
  const view = render(<EarnImagesField value={[]} onChange={onChange} {...props} />);
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { onChange, input, view };
};
const pick = (input: HTMLInputElement, files: File[]) => fireEvent.change(input, { target: { files } });
const uploadButton = () => screen.getByRole('button', { name: en('websiteApp.earn.upload') });

beforeEach(() => {
  upload.mockReset();
  logError.mockClear();
  state.uploading = false;
});

describe('EarnImagesField', () => {
  it('counts the photos against the cap when there is nothing to complain about', () => {
    mount({ value: ['https://ik.test/a.jpg'] });
    expect(screen.getByText(en('websiteApp.earn.imagesHint', { count: 1, max: EARN_LIMITS.images }))).toBeInTheDocument();
  });

  it('shows the form error in place of the count, announced as an alert', () => {
    mount({ error: 'Use an https link' });
    expect(screen.getByRole('alert')).toHaveTextContent('Use an https link');
  });

  it('opens the file picker from the upload button, for images only', () => {
    const { input } = mount();
    const open = vi.spyOn(input, 'click').mockImplementation(() => undefined);
    fireEvent.click(uploadButton());
    expect(open).toHaveBeenCalledTimes(1);
    expect(input).toHaveAttribute('accept', 'image/*');
    expect(input).toHaveAttribute('multiple');
  });

  it('uploads each picked photo in turn into the earn folder and appends the links', async () => {
    upload.mockImplementation(async (file: File) => `https://ik.test/website/earn/${file.name}`);
    const { input, onChange } = mount({ value: ['https://ik.test/old.jpg'] });
    pick(input, [image('a.jpg'), image('b.jpg')]);
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith([
        'https://ik.test/old.jpg',
        'https://ik.test/website/earn/a.jpg',
        'https://ik.test/website/earn/b.jpg',
      ]),
    );
    expect(upload.mock.calls.map((call) => [call[0].name, call[1]])).toEqual([
      ['a.jpg', '/website/earn'],
      ['b.jpg', '/website/earn'],
    ]);
    expect(input.value).toBe('');
  });

  it('keeps only the images when other files are picked too, and says so', async () => {
    upload.mockResolvedValue('https://ik.test/a.jpg');
    const { input, onChange } = mount();
    pick(input, [image('a.jpg'), image('notes.pdf', 'application/pdf')]);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['https://ik.test/a.jpg']));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(screen.getByText(en('websiteApp.earn.notImage'))).toBeInTheDocument();
  });

  it('uploads nothing and says so when no picked file is an image', async () => {
    const { input, onChange } = mount();
    pick(input, [image('notes.pdf', 'application/pdf')]);
    expect(await screen.findByText(en('websiteApp.earn.notImage'))).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does nothing when the picker is dismissed with no files', () => {
    const { input, onChange } = mount();
    pick(input, []);
    expect(upload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does nothing when a browser reports a change with no file list at all', () => {
    const { input, onChange } = mount();
    fireEvent.change(input, { target: { files: null } });
    expect(upload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uploads only what fits under the cap and says the cap was reached', async () => {
    upload.mockImplementation(async (file: File) => `https://ik.test/${file.name}`);
    const existing = Array.from({ length: EARN_LIMITS.images - 1 }, (_unused, index) => `https://ik.test/${index}.jpg`);
    const { input, onChange } = mount({ value: existing });
    pick(input, [image('a.jpg'), image('b.jpg')]);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([...existing, 'https://ik.test/a.jpg']));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(screen.getByText(en('websiteApp.earn.errImagesMax', { max: EARN_LIMITS.images }))).toBeInTheDocument();
  });

  it('adds nothing, reports the failure and logs it when an upload fails', async () => {
    const failure = new Error('ImageKit down');
    upload.mockRejectedValue(failure);
    const { input, onChange } = mount();
    pick(input, [image('a.jpg')]);
    expect(await screen.findByText(en('websiteApp.earn.uploadFailed'))).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('EarnSection', 'EarnImagesField', { error: failure, msg: 'earn image upload failed' });
  });

  it('adds a pasted https link and clears an earlier problem', async () => {
    const { input, onChange } = mount();
    pick(input, [image('notes.pdf', 'application/pdf')]);
    expect(await screen.findByText(en('websiteApp.earn.notImage'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(label('websiteApp.earn.imageUrl')), { target: { value: 'https://ik.test/link.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: en('websiteApp.earn.addImageUrl') }));
    expect(onChange).toHaveBeenCalledWith(['https://ik.test/link.jpg']);
    expect(screen.queryByText(en('websiteApp.earn.notImage'))).not.toBeInTheDocument();
  });

  it('locks upload and link entry once the photo cap is reached', () => {
    const full = Array.from({ length: EARN_LIMITS.images }, (_unused, index) => `https://ik.test/${index}.jpg`);
    mount({ value: full });
    expect(uploadButton()).toBeDisabled();
    expect(screen.getByLabelText(label('websiteApp.earn.imageUrl'))).toBeDisabled();
  });

  it('shows progress and locks entry while an upload runs', () => {
    state.uploading = true;
    mount();
    expect(uploadButton()).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(en('websiteApp.earn.uploading', { pct: 0 }));
    expect(screen.getByLabelText(label('websiteApp.earn.imageUrl'))).toBeDisabled();
  });

  it('reports upload progress for each photo, restarting from zero', async () => {
    state.uploading = true;
    upload.mockImplementation(async (_file: File, _folder: string, progress: (pct: number) => void) => {
      progress(40);
      return 'https://ik.test/a.jpg';
    });
    const { input } = mount();
    pick(input, [image('a.jpg')]);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(en('websiteApp.earn.uploading', { pct: 40 })));
  });

  it('logs a picker failure that escapes the upload handling', async () => {
    const { input } = mount();
    Object.defineProperty(input, 'files', { configurable: true, get: () => ({ get length() { throw new Error('picker broke'); } }) });
    fireEvent.change(input);
    await waitFor(() => expect(logError).toHaveBeenCalledTimes(1));
    expect(logError.mock.calls[0][2]).toMatchObject({ msg: 'earn image pick failed' });
  });
});
