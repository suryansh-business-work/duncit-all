import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { MyVerificationsDocument, SubmitVerificationDocument } from '@/graphql/verification';
import { VerificationType } from '@/generated/graphql/graphql';
import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { useVerifications } from '@/hooks/useVerifications';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockRequest = graphqlRequest as jest.Mock;
const reqPerm = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;

const items = [
  { type: 'IDENTITY', status: 'NOT_SUBMITTED', document_url: null, reject_reason: null },
  { type: 'EMAIL', status: 'APPROVED', document_url: null, reject_reason: null },
];

function route(doc: unknown) {
  if (doc === MyVerificationsDocument) return Promise.resolve({ myVerifications: items });
  if (doc === UploadImageDocument)
    return Promise.resolve({ uploadImageToImagekit: { url: 'http://img/doc.jpg' } });
  if (doc === SubmitVerificationDocument)
    return Promise.resolve({ submitVerification: { type: 'IDENTITY', status: 'PENDING' } });
  return Promise.resolve({});
}

beforeEach(() => {
  mockRequest.mockReset().mockImplementation(route);
  reqPerm.mockReset().mockResolvedValue({ granted: true });
  launch.mockReset();
});

describe('useVerifications', () => {
  it('loads the verification list', async () => {
    const { result } = renderHook(() => useVerifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(2);
  });

  it('uploads a document and submits it (deriving mime + name)', async () => {
    launch.mockResolvedValue({ canceled: false, assets: [{ base64: 'abc' }] });
    const { result } = renderHook(() => useVerifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.uploadFor(VerificationType.Identity);
    });
    const upload = mockRequest.mock.calls.find((c) => c[0] === UploadImageDocument)!;
    expect(upload[1].mimeType).toBe('image/jpeg');
    expect(upload[1].fileName).toMatch(/^doc-\d+\.jpg$/);
    expect(upload[1].folder).toBe('/verifications');
    expect(mockRequest).toHaveBeenCalledWith(
      SubmitVerificationDocument,
      { type: 'IDENTITY', document_url: 'http://img/doc.jpg' },
      { auth: true },
    );
    expect(result.current.busyType).toBeNull();
  });

  it('uses the asset mime type + file name when present', async () => {
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ base64: 'abc', mimeType: 'image/png', fileName: 'id.png' }],
    });
    const { result } = renderHook(() => useVerifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.uploadFor(VerificationType.Selfie);
    });
    const upload = mockRequest.mock.calls.find((c) => c[0] === UploadImageDocument)!;
    expect(upload[1].mimeType).toBe('image/png');
    expect(upload[1].fileName).toBe('id.png');
  });

  it('throws when photo permission is denied', async () => {
    reqPerm.mockResolvedValue({ granted: false });
    const { result } = renderHook(() => useVerifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await expect(result.current.uploadFor(VerificationType.Address)).rejects.toThrow(
        'Photo access',
      );
    });
  });

  it('is a no-op when the picker is cancelled or returns no image', async () => {
    launch.mockResolvedValueOnce({ canceled: true });
    const { result } = renderHook(() => useVerifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.uploadFor(VerificationType.Police);
    });
    launch.mockResolvedValueOnce({ canceled: false, assets: [{}] });
    await act(async () => {
      await result.current.uploadFor(VerificationType.Police);
    });
    expect(mockRequest).not.toHaveBeenCalledWith(
      UploadImageDocument,
      expect.anything(),
      expect.anything(),
    );
  });

  it('captures a load error', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useVerifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('ignores a load that resolves after unmount', async () => {
    let resolveLoad!: (value: unknown) => void;
    mockRequest.mockReset().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const { unmount } = renderHook(() => useVerifications());
    unmount();
    await act(async () => {
      resolveLoad({ myVerifications: [] });
    });
  });
});
