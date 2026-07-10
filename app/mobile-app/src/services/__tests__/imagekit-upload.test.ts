import { graphqlRequest } from '@/services/graphql.client';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const file = { uri: 'file://a.png', name: 'a.png', type: 'image/png' };

const AUTH = {
  token: 'tok',
  expire: 123,
  signature: 'sig',
  publicKey: 'pub',
  urlEndpoint: 'https://ik.io/x',
};

const stubFetch = (impl: Partial<Response>) =>
  jest.spyOn(global, 'fetch').mockResolvedValue(impl as Response);

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue({ getImagekitAuth: AUTH });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('uploadToImagekitDirect', () => {
  it('fetches signed auth then POSTs the file multipart and returns the hosted URL', async () => {
    const fetchMock = stubFetch({
      ok: true,
      json: jest.fn().mockResolvedValue({ url: 'https://ik.io/out.png' }),
    });

    const url = await uploadToImagekitDirect(file, '/support');
    expect(url).toBe('https://ik.io/out.png');
    // Auth is fetched via the authenticated GraphQL mutation.
    expect(mockRequest).toHaveBeenCalledWith(expect.anything(), {}, { auth: true });
    // The file bytes go straight to ImageKit's multipart upload endpoint.
    const [endpoint, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toContain('upload.imagekit.io');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('throws the ImageKit error message when the response is not ok', async () => {
    stubFetch({
      ok: false,
      json: jest.fn().mockResolvedValue({ message: 'file too large' }),
    });
    await expect(uploadToImagekitDirect(file, '/support')).rejects.toThrow('file too large');
  });

  it('falls back to "Upload failed" when the error body has no message', async () => {
    stubFetch({
      ok: false,
      json: jest.fn().mockResolvedValue(null),
    });
    await expect(uploadToImagekitDirect(file, '/support')).rejects.toThrow('Upload failed');
  });

  it('falls back to "Upload failed" when the response body cannot be parsed', async () => {
    stubFetch({
      ok: false,
      json: jest.fn().mockRejectedValue(new Error('bad json')),
    });
    await expect(uploadToImagekitDirect(file, '/support')).rejects.toThrow('Upload failed');
  });
});
