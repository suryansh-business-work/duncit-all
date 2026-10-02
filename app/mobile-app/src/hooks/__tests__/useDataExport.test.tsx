import { act, renderHook } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { useDataExport } from '@/hooks/useDataExport';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn(),
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const writeFile = FileSystem.writeAsStringAsync as jest.Mock;
const isAvailable = Sharing.isAvailableAsync as jest.Mock;
const share = Sharing.shareAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('useDataExport', () => {
  it('fetches the export, writes the JSON file and opens the share sheet', async () => {
    mockRequest.mockResolvedValue({ myDataExport: '{"profile":{}}' });
    isAvailable.mockResolvedValue(true);
    const { result } = renderHook(() => useDataExport());

    await act(async () => {
      await result.current.download();
    });

    const [uri, contents] = writeFile.mock.calls[0] as [string, string];
    expect(uri).toMatch(/^file:\/\/\/cache\/duncit-my-data-\d{4}-\d{2}-\d{2}\.json$/);
    expect(contents).toBe('{"profile":{}}');
    expect(share).toHaveBeenCalledWith(uri, { mimeType: 'application/json' });
    expect(result.current.busy).toBe(false);
  });

  it('throws when sharing is unsupported on the device', async () => {
    mockRequest.mockResolvedValue({ myDataExport: '{}' });
    isAvailable.mockResolvedValue(false);
    const { result } = renderHook(() => useDataExport());
    await expect(result.current.download()).rejects.toThrow(/sharing/i);
    expect(share).not.toHaveBeenCalled();
  });
});
