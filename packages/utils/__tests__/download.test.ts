import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  base64ToBlob,
  downloadBase64File,
  downloadBlob,
  downloadTextFile,
  printBase64File,
  printBlob,
} from '../src/download';

// jsdom does not implement createObjectURL/revokeObjectURL.
const createObjectURL = vi.fn(() => 'blob:mock-url');
const revokeObjectURL = vi.fn();

let clickedAnchors: HTMLAnchorElement[];

beforeEach(() => {
  clickedAnchors = [];
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clickedAnchors.push(this);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

describe('base64ToBlob', () => {
  it('decodes base64 into a Blob of the right bytes and mime type', async () => {
    const blob = base64ToBlob(btoa('hello'), 'application/pdf');
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBe(5);
    // jsdom's Blob has no .text(); round-trip through FileReader instead.
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(text).toBe('hello');
  });

  it('round-trips binary bytes above 0x7f', () => {
    const blob = base64ToBlob(btoa(String.fromCodePoint(0, 0xff, 0x80)), 'application/octet-stream');
    expect(blob.size).toBe(3);
  });
});

describe('downloadBlob', () => {
  it('clicks a temporary anchor and cleans it up', () => {
    downloadBlob(new Blob(['x'], { type: 'text/plain' }), 'note.txt');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickedAnchors).toHaveLength(1);
    expect(clickedAnchors[0].getAttribute('href')).toBe('blob:mock-url');
    expect(clickedAnchors[0].download).toBe('note.txt');
    expect(clickedAnchors[0].isConnected).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});

describe('downloadBase64File', () => {
  it('decodes and saves under the given filename and mime', () => {
    downloadBase64File(btoa('pdf-bytes'), 'ticket.pdf', 'application/pdf');
    expect(clickedAnchors).toHaveLength(1);
    expect(clickedAnchors[0].download).toBe('ticket.pdf');
    const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
    expect(blob.type).toBe('application/pdf');
  });

  // Pins the signature against mWeb's private fork, which takes
  // (filename, base64, mime). If the arguments are ever swapped to match it,
  // the payload below decodes to the filename and this test fails.
  it('takes (base64, filename, mime) in that order', async () => {
    downloadBase64File(btoa('payload-bytes'), 'statement.pdf', 'application/pdf');
    expect(clickedAnchors[0].download).toBe('statement.pdf');
    const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(text).toBe('payload-bytes');
  });
});

describe('downloadTextFile', () => {
  it('saves a plain string with the default text/html mime', () => {
    downloadTextFile('<p>hi</p>', 'doc.html');
    const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
    expect(blob.type).toBe('text/html');
    expect(clickedAnchors[0].download).toBe('doc.html');
  });

  it('honors a custom mime type', () => {
    downloadTextFile('a,b', 'data.csv', 'text/csv');
    const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
    expect(blob.type).toBe('text/csv');
  });
});

const printFrames = () => Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe[aria-hidden="true"]'));

describe('printBlob', () => {
  it('loads the file into a hidden, titled frame and prints it once loaded', () => {
    printBlob(new Blob(['%PDF-'], { type: 'application/pdf' }), 'Shipping label');
    const [frame] = printFrames();
    expect(frame.title).toBe('Shipping label');
    expect(frame.getAttribute('src')).toBe('blob:mock-url');
    expect(frame.tabIndex).toBe(-1);
    const print = vi.spyOn(frame.contentWindow as Window, 'print').mockImplementation(() => undefined);
    frame.dispatchEvent(new Event('load'));
    expect(print).toHaveBeenCalled();
  });

  it('replaces the previous frame and releases its URL on the next print', () => {
    printBlob(new Blob(['a'], { type: 'application/pdf' }), 'First');
    revokeObjectURL.mockClear();
    printBlob(new Blob(['b'], { type: 'application/pdf' }), 'Second');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(printFrames().map((frame) => frame.title)).toEqual(['Second']);
  });

  it('does nothing when the frame is gone before it loads', () => {
    printBlob(new Blob(['c'], { type: 'application/pdf' }), 'Gone');
    const [frame] = printFrames();
    frame.remove();
    expect(() => frame.dispatchEvent(new Event('load'))).not.toThrow();
  });
});

describe('printBase64File', () => {
  it('decodes the payload and prints it under the given title', () => {
    printBase64File(btoa('%PDF-1.4'), 'application/pdf', 'Invoice');
    const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
    expect(blob.type).toBe('application/pdf');
    expect(printFrames().at(-1)?.title).toBe('Invoice');
  });
});
