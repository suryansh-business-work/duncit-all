import { act, renderHook } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { graphqlRequest } from '@/services/graphql.client';
import { useSupportUpload } from '@/hooks/useSupportUpload';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

const pickDoc = DocumentPicker.getDocumentAsync as jest.Mock;
const readFile = FileSystem.readAsStringAsync as jest.Mock;
const mockRequest = graphqlRequest as jest.Mock;

const pick = (asset: Record<string, unknown> | null) =>
  asset ? { canceled: false, assets: [asset] } : { canceled: true, assets: null };

const run = async () => {
  const { result } = renderHook(() => useSupportUpload('/support'));
  let url: string | null = 'unset';
  await act(async () => {
    url = await result.current.pickAndUpload();
  });
  return { url, result };
};

beforeEach(() => {
  jest.clearAllMocks();
  readFile.mockResolvedValue('BASE64');
  mockRequest.mockResolvedValue({ uploadImageToImagekit: { url: 'https://ik/out.png' } });
});

describe('useSupportUpload', () => {
  it('returns null when the picker is cancelled', async () => {
    pickDoc.mockResolvedValueOnce(pick(null));
    const { url } = await run();
    expect(url).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('uploads an image (mime + name + size present) and returns the URL', async () => {
    pickDoc.mockResolvedValueOnce(
      pick({ uri: 'file://a.png', name: 'a.png', mimeType: 'image/png', size: 1024 }),
    );
    const { url } = await run();
    expect(url).toBe('https://ik/out.png');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        folder: '/support',
        fileName: 'a.png',
        mimeType: 'image/png',
        allowDocuments: true,
      }),
      { auth: true },
    );
  });

  it('falls back to a generated name and octet-stream mime when absent', async () => {
    pickDoc.mockResolvedValueOnce(pick({ uri: 'file://x' }));
    const { url } = await run();
    expect(url).toBe('https://ik/out.png');
    expect(mockRequest.mock.calls[0]?.[1].mimeType).toBe('application/octet-stream');
    expect(mockRequest.mock.calls[0]?.[1].fileName).toMatch(/^support-\d+/);
  });

  it('rejects a video over the 50 MB cap', async () => {
    pickDoc.mockResolvedValueOnce(
      pick({ uri: 'file://v.mp4', mimeType: 'video/mp4', size: 51 * 1024 * 1024 }),
    );
    const { url, result } = await run();
    expect(url).toBeNull();
    expect(result.current.error).toBe('Video is too large (max 50 MB).');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('caps a video by its extension even when the mime is generic (empty-mime bypass)', async () => {
    pickDoc.mockResolvedValueOnce(
      pick({
        uri: 'file://v.mkv',
        name: 'v.mkv',
        mimeType: 'application/octet-stream',
        size: 51 * 1024 * 1024,
      }),
    );
    const { url, result } = await run();
    expect(url).toBeNull();
    expect(result.current.error).toBe('Video is too large (max 50 MB).');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('rejects a non-video file over the 100 MB cap', async () => {
    pickDoc.mockResolvedValueOnce(
      pick({ uri: 'file://big.png', mimeType: 'image/png', size: 101 * 1024 * 1024 }),
    );
    const { url, result } = await run();
    expect(url).toBeNull();
    expect(result.current.error).toBe('File is too large (max 100 MB).');
  });

  it('reports Error and non-Error upload failures', async () => {
    pickDoc.mockResolvedValueOnce(pick({ uri: 'file://a.png', mimeType: 'image/png' }));
    mockRequest.mockRejectedValueOnce(new Error('IK down'));
    const first = await run();
    expect(first.url).toBeNull();
    expect(first.result.current.error).toBe('IK down');

    pickDoc.mockResolvedValueOnce(pick({ uri: 'file://a.png', mimeType: 'image/png' }));
    mockRequest.mockRejectedValueOnce('nope');
    const second = await run();
    expect(second.url).toBeNull();
    expect(second.result.current.error).toBe('Upload failed');
  });
});
