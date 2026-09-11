/**
 * The picture button, against a real (headless) tiptap editor.
 *
 * What matters is the ORDER: the upload finishes before anything is inserted, so
 * a failed upload leaves the document untouched rather than leaving an
 * unreachable src in saved HTML. The progress bar is asserted on its variant as
 * well as its value, because a determinate bar parked at 100% while the server
 * still has work to do would be inventing progress it cannot see.
 */
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { uploadMock } = vi.hoisted(() => ({ uploadMock: vi.fn() }));

vi.mock('@duncit/media-picker', () => ({
  useImagekitDirectUpload: () => ({ upload: uploadMock, uploading: false }),
}));

import { ImageButton } from '../src/ImageButton';
import { buttonNamed, click, flush, mount } from './harness';

const editors: Editor[] = [];

const editorWith = (content = '<p>Court 2</p>') => {
  const editor = new Editor({
    content,
    extensions: [StarterKit, Image.configure({ inline: false, allowBase64: false })],
  });
  editors.push(editor);
  return editor;
};

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

const png = () => new File(['x'], 'court.png', { type: 'image/png' });

/**
 * Put files on the hidden input, the way the browser does after the dialog.
 *
 * `files` is read-only on HTMLInputElement, so it is defined rather than
 * assigned — and the input is NOT clicked here, because clicking a file input is
 * what opens the dialog we are standing in for.
 */
const choose = (host: HTMLElement, files: File[]) => {
  const input = host.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('no file input');
  Object.defineProperty(input, 'files', { configurable: true, value: files });
  return input;
};

/** Fire the change event React is listening for, inside act. */
const fireChange = async (input: HTMLInputElement) => {
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const bar = () => document.body.querySelector('[role="progressbar"]');

/** An upload the test finishes by hand, so "in flight" is an assertable state. */
function deferredUpload() {
  let settle: (() => void) | undefined;
  let report: ((pct: number) => void) | undefined;
  uploadMock.mockImplementation((_file: File, _folder: string, onProgress?: (pct: number) => void) => {
    report = onProgress;
    return new Promise((resolve) => {
      settle = () => resolve('https://ik.imagekit.io/d/a.png');
    });
  });
  return {
    progress: async (pct: number) => {
      await act(async () => report?.(pct));
    },
    finish: async () => {
      await act(async () => {
        settle?.();
      });
    },
  };
}

const render = (editor: Editor, onError = vi.fn()) => ({
  ui: <ImageButton editor={editor} folder="/rich-text" onError={onError} />,
  onError,
});

beforeEach(() => {
  uploadMock.mockReset();
});

describe('ImageButton', () => {
  it('uploads the chosen file to the given folder and inserts the returned URL', async () => {
    uploadMock.mockResolvedValue('https://ik.imagekit.io/duncit/rich-text/court.png');
    const editor = editorWith();
    const { ui, onError } = render(editor);
    const host = await mount(ui);

    const input = choose(host, [png()]);
    await fireChange(input);
    await flush();

    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(uploadMock.mock.calls[0][1]).toBe('/rich-text');
    expect(editor.getHTML()).toContain('src="https://ik.imagekit.io/duncit/rich-text/court.png"');
    // The file name becomes the alt text, so the picture is not silently
    // unlabelled for a screen reader.
    expect(editor.getHTML()).toContain('alt="court.png"');
    expect(onError).toHaveBeenLastCalledWith(false);
  });

  it('inserts NOTHING when the upload fails, and says so', async () => {
    uploadMock.mockRejectedValue(new Error('imagekit down'));
    const editor = editorWith();
    const { ui, onError } = render(editor);
    const host = await mount(ui);

    const input = choose(host, [png()]);
    await fireChange(input);
    await flush();

    expect(editor.getHTML()).not.toContain('<img');
    expect(onError).toHaveBeenLastCalledWith(true);
  });

  it('does nothing at all when the file dialog is cancelled', async () => {
    const editor = editorWith();
    const { ui, onError } = render(editor);
    const host = await mount(ui);

    const input = choose(host, []);
    await fireChange(input);
    await flush();

    expect(uploadMock).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('clears the input so the SAME file can be picked twice', async () => {
    uploadMock.mockResolvedValue('https://ik.imagekit.io/d/a.png');
    const editor = editorWith();
    const host = await mount(render(editor).ui);

    const input = choose(host, [png()]);
    await fireChange(input);
    await flush();

    // Without the reset the change event never fires again for the same choice.
    expect(input.value).toBe('');
  });

  it('tracks real byte progress, then stops claiming to know once all bytes are sent', async () => {
    const upload = deferredUpload();
    const editor = editorWith();
    const host = await mount(render(editor).ui);

    const input = choose(host, [png()]);
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // 0% — nothing has left the browser yet.
    // No jest-dom in this package (the harness says why), so the DOM is read directly.
    expect(bar()?.getAttribute('aria-valuenow')).toBe('0');

    // XHR reports the bytes honestly, so the bar follows them.
    await upload.progress(40);
    expect(bar()?.getAttribute('aria-valuenow')).toBe('40');

    // At 100 the bytes are all sent but the server's own hop to ImageKit has not
    // happened yet, and nothing reports that — so the bar stops showing a number
    // rather than sitting at 100% pretending to be done.
    await upload.progress(100);
    expect(bar()?.className).toContain('indeterminate');

    await upload.finish();
    await flush();
    expect(bar()).toBeNull();
  });

  it('disables the button while an upload is in flight', async () => {
    const upload = deferredUpload();
    const editor = editorWith();
    const host = await mount(render(editor).ui);

    const input = choose(host, [png()]);
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Named by the uploading label now, and refusing a second pick.
    const busy = buttonNamed(host, 'Uploading picture…');
    expect(busy?.disabled).toBe(true);

    await upload.finish();
    await flush();
    expect(buttonNamed(host, 'Insert picture')?.disabled).toBe(false);
  });

  it('opens the file dialog when the button is pressed', async () => {
    const editor = editorWith();
    const host = await mount(render(editor).ui);
    const input = host.querySelector<HTMLInputElement>('input[type="file"]');
    const opened = vi.fn();
    if (input) input.click = opened;

    await click(buttonNamed(host, 'Insert picture'));
    expect(opened).toHaveBeenCalledTimes(1);
  });
});
