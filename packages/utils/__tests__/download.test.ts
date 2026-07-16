import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { base64ToBlob, downloadBase64File, downloadBlob, downloadTextFile } from '../src/download';

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
