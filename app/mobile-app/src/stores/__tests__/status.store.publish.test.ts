import { graphqlRequest } from '@/services/graphql.client';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { compressUploadedVideo } from '@/services/video-compression';
import { useStatusStore } from '@/stores/status.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/imagekit-upload', () => ({ uploadToImagekitDirect: jest.fn() }));
jest.mock('@/services/video-compression', () => ({ compressUploadedVideo: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const mockUpload = uploadToImagekitDirect as jest.Mock;
const mockCompress = compressUploadedVideo as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  // fetch(true) + createPost both go through graphqlRequest.
  mockRequest.mockImplementation(async (doc: unknown) => {
    const body = JSON.stringify(doc);
    if (body.includes('MobileUploadImage')) {
      return { uploadImageToImagekit: { url: 'https://cdn/posts/pic.jpg', fileId: 'f1' } };
    }
    if (body.includes('MobileCreatePost')) {
      return { createPost: { id: 'p1', image_url: 'x', caption: '', created_at: 'now' } };
    }
    return { stories: [], myStories: [] };
  });
  mockUpload.mockResolvedValue('https://cdn/posts/raw.mp4');
  mockCompress.mockResolvedValue('https://cdn/posts/small.mp4');
});

describe('status.store publish (video vs image pipelines)', () => {
  it('streams videos from their URI with real % + FFmpeg pass (no base64)', async () => {
    const seen: number[] = [];
    const unsub = useStatusStore.subscribe((s) => {
      seen.push(s.progress);
    });
    await useStatusStore.getState().publish({
      uri: 'file://story.mp4',
      fileName: 'story.mp4',
      mimeType: 'video/mp4',
      mediaType: 'VIDEO',
    });
    unsub();

    expect(mockUpload).toHaveBeenCalledWith(
      { uri: 'file://story.mp4', name: 'story.mp4', type: 'video/mp4' },
      '/posts',
      expect.any(Function),
    );
    expect(mockCompress).toHaveBeenCalledWith(
      'https://cdn/posts/raw.mp4',
      '/posts',
      expect.any(Function),
    );
    // The compressed URL is what the story records.
    const createCall = mockRequest.mock.calls.find(([doc]) =>
      JSON.stringify(doc).includes('MobileCreatePost'),
    );
    expect(createCall?.[1].input.image_url).toBe('https://cdn/posts/small.mp4');
    expect(createCall?.[1].input.media_type).toBe('VIDEO');
    // Progress starts at the video baseline and finishes the pipeline.
    expect(seen[0]).toBe(2);
    expect(seen).toContain(100);
    expect(seen[seen.length - 1]).toBe(0);

    // The stage callbacks map real percentages into their bands.
    const uploadPct = mockUpload.mock.calls[0][2] as (pct: number) => void;
    const compressPct = mockCompress.mock.calls[0][2] as (pct: number) => void;
    uploadPct(100);
    expect(useStatusStore.getState().progress).toBe(55);
    compressPct(100);
    expect(useStatusStore.getState().progress).toBe(70);
  });

  it('defaults the video name/type and requires a URI', async () => {
    await useStatusStore.getState().publish({ uri: 'file://v', mediaType: 'VIDEO' });
    expect(mockUpload.mock.calls[0][0].name).toMatch(/^story-\d+\.mp4$/);
    expect(mockUpload.mock.calls[0][0].type).toBe('video/mp4');

    await expect(useStatusStore.getState().publish({ mediaType: 'VIDEO' })).rejects.toThrow(
      'No media selected.',
    );
    await expect(
      useStatusStore.getState().publish({ base64: 'abc', uri: null, mediaType: 'VIDEO' }),
    ).rejects.toThrow('No media selected.');
  });

  it('uploads images through the server with the MOBILE_MWEB surface', async () => {
    await useStatusStore.getState().publish({
      base64: 'abc',
      fileName: 'pic.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'IMAGE',
    });
    const uploadCall = mockRequest.mock.calls.find(([doc]) =>
      JSON.stringify(doc).includes('MobileUploadImage'),
    );
    expect(uploadCall?.[1]).toMatchObject({
      fileBase64: 'data:image/jpeg;base64,abc',
      fileName: 'pic.jpg',
      folder: '/posts',
      surface: 'MOBILE_MWEB',
    });
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockCompress).not.toHaveBeenCalled();
  });

  it('still refuses an image publish without base64 bytes', async () => {
    await expect(useStatusStore.getState().publish({ uri: 'file://p.jpg' })).rejects.toThrow(
      'No media selected.',
    );
    expect(useStatusStore.getState().progress).toBe(0);
  });
});
