import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { shareTranscript } from '@/utils/transcript';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

const write = FileSystem.writeAsStringAsync as jest.Mock;
const isAvailable = Sharing.isAvailableAsync as jest.Mock;
const share = Sharing.shareAsync as jest.Mock;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

beforeEach(() => jest.clearAllMocks());

describe('shareTranscript', () => {
  it('writes the .txt file and opens the share sheet when available', async () => {
    isAvailable.mockResolvedValue(true);
    await shareTranscript({ filename: 'chat.txt', text: 'hello' });
    expect(write).toHaveBeenCalledWith('file:///cache/chat.txt', 'hello');
    expect(share).toHaveBeenCalledWith(
      'file:///cache/chat.txt',
      expect.objectContaining({ mimeType: 'text/plain' }),
    );
  });

  it('writes the .docx base64 binary with the Office mime', async () => {
    isAvailable.mockResolvedValue(true);
    await shareTranscript({ filename: 'chat.docx', text: 'hi', content_base64: 'QUJD' });
    expect(write).toHaveBeenCalledWith('file:///cache/chat.docx', 'QUJD', {
      encoding: 'base64',
    });
    expect(share).toHaveBeenCalledWith(
      'file:///cache/chat.docx',
      expect.objectContaining({ mimeType: DOCX_MIME }),
    );
  });

  it('falls back to plain text when a .docx has no base64 payload', async () => {
    isAvailable.mockResolvedValue(false);
    await shareTranscript({ filename: 'chat.docx', text: 'plain', content_base64: null });
    expect(write).toHaveBeenCalledWith('file:///cache/chat.docx', 'plain');
    expect(share).not.toHaveBeenCalled();
  });

  it('writes the file but skips sharing when unavailable', async () => {
    isAvailable.mockResolvedValue(false);
    await shareTranscript({ filename: 'chat.txt', text: 'hello' });
    expect(write).toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
  });

  it('falls back to an empty base dir when cacheDirectory is null', async () => {
    (FileSystem as { cacheDirectory: string | null }).cacheDirectory = null;
    isAvailable.mockResolvedValue(false);
    await shareTranscript({ filename: 'c.txt', text: 'x' });
    expect(write).toHaveBeenCalledWith('c.txt', 'x');
  });
});
