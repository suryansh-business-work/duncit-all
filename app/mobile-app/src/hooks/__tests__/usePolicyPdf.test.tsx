import { act, renderHook } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { usePolicyPdf } from '@/hooks/usePolicyPdf';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const writeFile = FileSystem.writeAsStringAsync as jest.Mock;
const isAvailable = Sharing.isAvailableAsync as jest.Mock;
const share = Sharing.shareAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('usePolicyPdf', () => {
  it('fetches the base64, writes the file and opens the share sheet', async () => {
    mockRequest.mockResolvedValue({ policyPdfBase64: 'JVBERi0=' });
    isAvailable.mockResolvedValue(true);
    const { result } = renderHook(() => usePolicyPdf());

    await act(async () => {
      await result.current.download('privacy-policy');
    });

    expect(writeFile).toHaveBeenCalledWith('file:///cache/policy-privacy-policy.pdf', 'JVBERi0=', {
      encoding: 'base64',
    });
    expect(share).toHaveBeenCalledWith('file:///cache/policy-privacy-policy.pdf', {
      mimeType: 'application/pdf',
    });
    expect(result.current.busy).toBe(false);
  });

  it('throws when the PDF is unavailable', async () => {
    mockRequest.mockResolvedValue({ policyPdfBase64: '' });
    const { result } = renderHook(() => usePolicyPdf());
    await expect(result.current.download('x')).rejects.toThrow(/not available/i);
  });

  it('throws when sharing is unsupported on the device', async () => {
    mockRequest.mockResolvedValue({ policyPdfBase64: 'abc' });
    isAvailable.mockResolvedValue(false);
    const { result } = renderHook(() => usePolicyPdf());
    await expect(result.current.download('x')).rejects.toThrow(/sharing/i);
  });
});
