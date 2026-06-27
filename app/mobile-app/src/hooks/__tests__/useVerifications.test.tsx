import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import {
  MyVerificationsDocument,
  SubmitAddressVerificationDocument,
  SubmitVerificationDocument,
} from '@/graphql/verification';
import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { useVerifications, MAX_DOC_BYTES } from '@/hooks/useVerifications';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

const mockRequest = graphqlRequest as jest.Mock;
const reqPerm = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const getDoc = DocumentPicker.getDocumentAsync as jest.Mock;
const readFile = FileSystem.readAsStringAsync as jest.Mock;

const items = [
  {
    type: 'IDENTITY',
    status: 'NOT_SUBMITTED',
    document_url: null,
    address: null,
    reject_reason: null,
  },
  {
    type: 'ADDRESS',
    status: 'NOT_SUBMITTED',
    document_url: null,
    address: null,
    reject_reason: null,
  },
  {
    type: 'EMAIL',
    status: 'VERIFIED_BY_APP',
    document_url: null,
    address: null,
    reject_reason: null,
  },
];

function route(doc: unknown) {
  if (doc === MyVerificationsDocument) return Promise.resolve({ myVerifications: items });
  if (doc === UploadImageDocument)
    return Promise.resolve({ uploadImageToImagekit: { url: 'http://img/doc.jpg' } });
  if (doc === SubmitVerificationDocument)
    return Promise.resolve({ submitVerification: { type: 'IDENTITY', status: 'PENDING' } });
  if (doc === SubmitAddressVerificationDocument)
    return Promise.resolve({ submitAddressVerification: { type: 'ADDRESS', status: 'PENDING' } });
  return Promise.resolve({});
}

beforeEach(() => {
  mockRequest.mockReset().mockImplementation(route);
  reqPerm.mockReset().mockResolvedValue({ granted: true });
  launch.mockReset();
  getDoc.mockReset().mockResolvedValue({ canceled: true, assets: null });
  readFile.mockReset().mockResolvedValue('pdfbase64');
});

async function loaded() {
  const hook = renderHook(() => useVerifications());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe('useVerifications', () => {
  it('loads the three verification types', async () => {
    const { result } = await loaded();
    expect(result.current.items).toHaveLength(3);
  });

  it('uploads an identity image and submits it', async () => {
    launch.mockResolvedValue({ canceled: false, assets: [{ base64: 'abc', fileSize: 100 }] });
    const { result } = await loaded();
    await act(async () => {
      await result.current.uploadIdentityImage();
    });
    const upload = mockRequest.mock.calls.find((c) => c[0] === UploadImageDocument)!;
    expect(upload[1].mimeType).toBe('image/jpeg');
    expect(upload[1].fileName).toMatch(/^doc-\d+\.jpg$/);
    expect(upload[1].allowDocuments).toBe(true);
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
      assets: [{ base64: 'abc', mimeType: 'image/png', fileName: 'id.png', fileSize: 50 }],
    });
    const { result } = await loaded();
    await act(async () => {
      await result.current.uploadIdentityImage();
    });
    const upload = mockRequest.mock.calls.find((c) => c[0] === UploadImageDocument)!;
    expect(upload[1].mimeType).toBe('image/png');
    expect(upload[1].fileName).toBe('id.png');
  });

  it('uploads an identity PDF via the document picker', async () => {
    getDoc.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://id.pdf', name: 'id.pdf', mimeType: 'application/pdf', size: 200 }],
    });
    const { result } = await loaded();
    await act(async () => {
      await result.current.uploadIdentityPdf();
    });
    const upload = mockRequest.mock.calls.find((c) => c[0] === UploadImageDocument)!;
    expect(upload[1].mimeType).toBe('application/pdf');
    expect(upload[1].fileName).toBe('id.pdf');
    expect(readFile).toHaveBeenCalledWith('file://id.pdf', { encoding: 'base64' });
  });

  it('falls back to derived pdf name + mime when the asset omits them', async () => {
    getDoc.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://x', size: 10 }] });
    const { result } = await loaded();
    await act(async () => {
      await result.current.uploadIdentityPdf();
    });
    const upload = mockRequest.mock.calls.find((c) => c[0] === UploadImageDocument)!;
    expect(upload[1].mimeType).toBe('application/pdf');
    expect(upload[1].fileName).toMatch(/^doc-\d+\.pdf$/);
  });

  it('rejects a document over the 4 MB cap with an inline error', async () => {
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ base64: 'abc', fileSize: MAX_DOC_BYTES + 1 }],
    });
    const { result } = await loaded();
    await act(async () => {
      await result.current.uploadIdentityImage();
    });
    expect(result.current.docError).toMatch(/under 4 MB/);
    expect(mockRequest).not.toHaveBeenCalledWith(
      UploadImageDocument,
      expect.anything(),
      expect.anything(),
    );
  });

  it('falls back to the base64 length when the asset omits a size, rejecting if oversized', async () => {
    // base64 of length L ≈ 3L/4 bytes; build one just over the cap.
    const big = 'a'.repeat(Math.ceil((MAX_DOC_BYTES + 1024) * 4) / 3);
    launch.mockResolvedValue({ canceled: false, assets: [{ base64: big }] });
    const { result } = await loaded();
    await act(async () => {
      await result.current.uploadIdentityImage();
    });
    expect(result.current.docError).toMatch(/under 4 MB/);
  });

  it('throws when photo permission is denied', async () => {
    reqPerm.mockResolvedValue({ granted: false });
    const { result } = await loaded();
    await act(async () => {
      await expect(result.current.uploadIdentityImage()).rejects.toThrow('Photo access');
    });
  });

  it('is a no-op when the image picker is cancelled or returns no image', async () => {
    launch.mockResolvedValueOnce({ canceled: true });
    const { result } = await loaded();
    await act(async () => {
      await result.current.uploadIdentityImage();
    });
    launch.mockResolvedValueOnce({ canceled: false, assets: [{}] });
    await act(async () => {
      await result.current.uploadIdentityImage();
    });
    expect(mockRequest).not.toHaveBeenCalledWith(
      UploadImageDocument,
      expect.anything(),
      expect.anything(),
    );
  });

  it('is a no-op when the PDF picker is cancelled', async () => {
    getDoc.mockResolvedValue({ canceled: true, assets: null });
    const { result } = await loaded();
    await act(async () => {
      await result.current.uploadIdentityPdf();
    });
    expect(readFile).not.toHaveBeenCalled();
  });

  it('submits a structured address', async () => {
    const { result } = await loaded();
    await act(async () => {
      await result.current.submitAddress({
        line1: '1 Road',
        city: 'Mumbai',
        state: 'MH',
        pincode: '400001',
      });
    });
    expect(mockRequest).toHaveBeenCalledWith(
      SubmitAddressVerificationDocument,
      { line1: '1 Road', city: 'Mumbai', state: 'MH', pincode: '400001' },
      { auth: true },
    );
    expect(result.current.busyType).toBeNull();
  });

  it('surfaces an address submit error', async () => {
    const { result } = await loaded();
    mockRequest.mockImplementation((doc) => {
      if (doc === SubmitAddressVerificationDocument) return Promise.reject(new Error('nope'));
      return route(doc);
    });
    await act(async () => {
      await expect(
        result.current.submitAddress({ line1: '1', city: 'c', state: 's', pincode: 'p' }),
      ).rejects.toThrow('nope');
    });
    expect(result.current.busyType).toBeNull();
  });

  it('captures a load error', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('boom'));
    const { result } = await loaded();
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
