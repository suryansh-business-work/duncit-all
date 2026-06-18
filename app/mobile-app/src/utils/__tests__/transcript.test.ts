import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { shareTranscript } from '@/utils/transcript';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

const write = FileSystem.writeAsStringAsync as jest.Mock;
const isAvailable = Sharing.isAvailableAsync as jest.Mock;
const share = Sharing.shareAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('shareTranscript', () => {
  it('writes the file and opens the share sheet when available', async () => {
    isAvailable.mockResolvedValue(true);
    await shareTranscript('chat.txt', 'hello');
    expect(write).toHaveBeenCalledWith('file:///cache/chat.txt', 'hello');
    expect(share).toHaveBeenCalledWith(
      'file:///cache/chat.txt',
      expect.objectContaining({ mimeType: 'text/plain' }),
    );
  });

  it('writes the file but skips sharing when unavailable', async () => {
    isAvailable.mockResolvedValue(false);
    await shareTranscript('chat.txt', 'hello');
    expect(write).toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
  });

  it('falls back to an empty base dir when cacheDirectory is null', async () => {
    (FileSystem as { cacheDirectory: string | null }).cacheDirectory = null;
    isAvailable.mockResolvedValue(false);
    await shareTranscript('c.txt', 'x');
    expect(write).toHaveBeenCalledWith('c.txt', 'x');
  });
});
