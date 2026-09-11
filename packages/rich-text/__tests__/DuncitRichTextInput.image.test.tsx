/**
 * Pictures, wired all the way through the editor rather than just the button.
 *
 * The button's own behaviour is covered in ImageButton.test.tsx; what is asserted
 * here is the wiring only the whole editor has: the caller's `imageFolder`
 * reaching the upload, the inserted picture arriving in the HTML the caller
 * stores, and a failed upload surfacing in the SAME error slot the AI action
 * uses.
 */
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { uploadMock } = vi.hoisted(() => ({ uploadMock: vi.fn() }));

vi.mock('@duncit/media-picker', () => ({
  useImagekitDirectUpload: () => ({ upload: uploadMock, uploading: false }),
}));

import { DuncitRichTextInput } from '../src/DuncitRichTextInput';
import { flush, mount } from './harness';

const AUTHORED = '<p>Doubles at Court 2.</p>';

/** Hand the hidden input a file and fire the change React listens for. */
const pick = async (host: HTMLElement) => {
  const input = host.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('no file input');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [new File(['x'], 'court.png', { type: 'image/png' })],
  });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await flush();
};

const alertText = (host: HTMLElement) => host.querySelector('[role="alert"]')?.textContent;

beforeEach(() => {
  uploadMock.mockReset();
});

describe('DuncitRichTextInput · pictures', () => {
  it('uploads to the folder the caller named and reports the picture through onChange', async () => {
    uploadMock.mockResolvedValue('https://ik.imagekit.io/duncit/pods/court.png');
    const onChange = vi.fn();
    const host = await mount(
      <DuncitRichTextInput value={AUTHORED} onChange={onChange} imageFolder="/pods" />,
    );

    await pick(host);

    expect(uploadMock.mock.calls[0][1]).toBe('/pods');
    expect(onChange.mock.lastCall?.[0]).toContain('src="https://ik.imagekit.io/duncit/pods/court.png"');
    expect(alertText(host)).toBeUndefined();
  });

  it('defaults to the /rich-text folder, so document images stay clear of venue media', async () => {
    uploadMock.mockResolvedValue('https://ik.imagekit.io/duncit/rich-text/court.png');
    const host = await mount(<DuncitRichTextInput value={AUTHORED} onChange={vi.fn()} />);

    await pick(host);

    expect(uploadMock.mock.calls[0][1]).toBe('/rich-text');
  });

  it('says the picture failed, in the slot the AI error uses, and stores nothing', async () => {
    uploadMock.mockRejectedValue(new Error('imagekit down'));
    const onChange = vi.fn();
    const host = await mount(<DuncitRichTextInput value={AUTHORED} onChange={onChange} />);
    onChange.mockClear();

    await pick(host);

    expect(alertText(host)).toContain('That picture could not be uploaded');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('offers no picture button at all when the editor is read-only', async () => {
    const host = await mount(<DuncitRichTextInput value={AUTHORED} onChange={vi.fn()} readOnly />);

    expect(host.querySelector('input[type="file"]')).toBeNull();
  });
});
