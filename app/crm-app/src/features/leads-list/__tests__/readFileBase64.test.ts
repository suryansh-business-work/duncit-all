import { readFileBase64 } from '../readFileBase64';

/** A picked spreadsheet's bytes as base64, the way the CRM's Excel import takes them. */

type Reader = {
  result: unknown;
  error: Error | null;
  onload: (() => void) | null;
  onerror: (() => void) | null;
};

const realFetch = global.fetch;
const realReader = global.FileReader;
let outcome: { result?: unknown; error?: Error } = {};

class FakeReader implements Reader {
  result: unknown = null;
  error: Error | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL() {
    if (outcome.error) {
      this.error = outcome.error;
      this.onerror?.();
      return;
    }
    this.result = outcome.result;
    this.onload?.();
  }
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ blob: jest.fn().mockResolvedValue('blob') });
  global.FileReader = FakeReader as unknown as typeof FileReader;
});

afterAll(() => {
  global.fetch = realFetch;
  global.FileReader = realReader;
});

describe('readFileBase64', () => {
  it('reads the local file and drops the data URL prefix', async () => {
    outcome = { result: 'data:application/vnd.ms-excel;base64,QkFTRTY0' };
    await expect(readFileBase64('file:///cache/leads.xls')).resolves.toBe('QkFTRTY0');
    expect(global.fetch).toHaveBeenCalledWith('file:///cache/leads.xls');
  });

  it('keeps a result with no prefix, and reads nothing as empty', async () => {
    outcome = { result: 'QkFTRTY0' };
    await expect(readFileBase64('file:///a.csv')).resolves.toBe('QkFTRTY0');
    outcome = { result: null };
    await expect(readFileBase64('file:///a.csv')).resolves.toBe('');
  });

  it('fails with the reader’s error', async () => {
    outcome = { error: new Error('unreadable') };
    await expect(readFileBase64('file:///a.csv')).rejects.toThrow('unreadable');
  });
});
