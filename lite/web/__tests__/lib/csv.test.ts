import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadText, toCsv } from '../../lib/csv';

describe('toCsv', () => {
  it('joins cells with commas and rows with CRLF', () => {
    expect(
      toCsv([
        ['Name', 'Seats'],
        ['Asha Rao', 2],
      ]),
    ).toBe('Name,Seats\r\nAsha Rao,2');
  });

  it('quotes cells holding a comma, a quote or a line break, doubling inner quotes', () => {
    expect(toCsv([['Rao, Asha', 'She said "hi"', 'line one\nline two', 'carriage\rreturn']])).toBe(
      '"Rao, Asha","She said ""hi""","line one\nline two","carriage\rreturn"',
    );
  });

  it('writes empty cells for null and undefined, and keeps zero', () => {
    expect(toCsv([[null, undefined, 0, '']])).toBe(',,0,');
  });

  it('gives an empty string for no rows', () => {
    expect(toCsv([])).toBe('');
  });
});

describe('downloadText', () => {
  const created: Blob[] = [];
  const revoke = vi.fn();
  let clicked: HTMLAnchorElement[] = [];

  beforeEach(() => {
    created.length = 0;
    clicked = [];
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (blob: Blob) => {
        created.push(blob);
        return 'blob:lite/guests';
      },
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function record(this: HTMLAnchorElement) {
      clicked.push(this);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    revoke.mockReset();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('clicks a download link for a CSV blob of the text, then releases the blob URL', async () => {
    downloadText('guests.csv', 'Name\r\nAsha');

    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.download).toBe('guests.csv');
    expect(clicked[0]?.href).toBe('blob:lite/guests');
    expect(created).toHaveLength(1);
    expect(created[0]?.type).toBe('text/csv;charset=utf-8');
    expect(await created[0]?.text()).toBe('Name\r\nAsha');
    expect(revoke).toHaveBeenCalledWith('blob:lite/guests');
  });

  it('uses the type it is given', () => {
    downloadText('notes.txt', 'hello', 'text/plain');
    expect(created[0]?.type).toBe('text/plain');
    expect(clicked[0]?.download).toBe('notes.txt');
  });
});
