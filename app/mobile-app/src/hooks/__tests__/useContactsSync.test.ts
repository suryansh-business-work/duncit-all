import { act, renderHook } from '@testing-library/react-native';
import { Contact, requestPermissionsAsync } from 'expo-contacts';

import { useContactsSync } from '@/hooks/useContactsSync';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('expo-contacts', () => ({
  ContactField: { FULL_NAME: 'fullName', PHONES: 'phones' },
  requestPermissionsAsync: jest.fn(),
  Contact: { getCount: jest.fn(), getAllDetails: jest.fn() },
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockLogError = jest.fn();
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: (...args: unknown[]) => mockLogError(...args) } },
}));

const mockPermission = requestPermissionsAsync as jest.Mock;
const mockCount = Contact.getCount as jest.Mock;
const mockDetails = Contact.getAllDetails as jest.Mock;
const mockRequest = graphqlRequest as jest.Mock;

const person = (index: number) => ({
  fullName: `Friend ${index}`,
  phones: [{ number: `+91 98450 ${String(10000 + index)}` }],
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPermission.mockResolvedValue({ granted: true });
  mockRequest.mockResolvedValue({ syncContacts: { sync_id: 'sync-1' } });
});

function setup(onSynced = jest.fn().mockResolvedValue(undefined)) {
  const hook = renderHook(() => useContactsSync(onSynced));
  return { ...hook, onSynced };
}

describe('useContactsSync', () => {
  it('asks before reading anything, and "Not now" reads nothing', () => {
    const { result } = setup();
    expect(result.current.asking).toBe(false);
    act(() => result.current.request());
    expect(result.current.asking).toBe(true);
    act(() => result.current.decline());
    expect(result.current.asking).toBe(false);
    expect(mockPermission).not.toHaveBeenCalled();
    expect(mockCount).not.toHaveBeenCalled();
  });

  it('reads the phone book a page at a time once agreed, syncs it and refreshes', async () => {
    mockCount.mockResolvedValue(600);
    mockDetails
      .mockResolvedValueOnce(Array.from({ length: 500 }, (_, index) => person(index)))
      // A contact with no name and a number with no digits still reads safely.
      .mockResolvedValueOnce([{ fullName: undefined, phones: [{ number: undefined }] }]);
    const { result, onSynced } = setup();

    act(() => result.current.request());
    await act(async () => {
      await result.current.agree();
    });

    expect(result.current.asking).toBe(false);
    expect(mockDetails).toHaveBeenCalledTimes(2);
    expect(mockDetails).toHaveBeenLastCalledWith(['fullName', 'phones'], {
      limit: 500,
      offset: 500,
    });
    expect(mockRequest).toHaveBeenCalled();
    expect(onSynced).toHaveBeenCalled();
    expect(result.current.failure).toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it('stops after a full last page', async () => {
    mockCount.mockResolvedValue(500);
    mockDetails.mockResolvedValueOnce(Array.from({ length: 500 }, (_, index) => person(index)));
    const { result } = setup();
    await act(async () => {
      await result.current.agree();
    });
    expect(mockDetails).toHaveBeenCalledTimes(1);
  });

  it('reports a refused permission', async () => {
    mockPermission.mockResolvedValue({ granted: false, canAskAgain: true });
    const { result } = setup();
    await act(async () => {
      await result.current.agree();
    });
    expect(result.current.failure).toBe('DENIED');
    expect(mockCount).not.toHaveBeenCalled();
  });

  it('reports and logs a failed sync', async () => {
    mockCount.mockRejectedValue(new Error('no contacts provider'));
    const { result } = setup();
    await act(async () => {
      await result.current.agree();
    });
    expect(result.current.failure).toBe('FAILED');
    expect(mockLogError).toHaveBeenCalledWith('useContactsSync', 'request', expect.anything());
  });

  it('keeps a finished sync when only the refresh fails', async () => {
    mockCount.mockResolvedValue(0);
    mockDetails.mockResolvedValue([]);
    const { result } = setup(jest.fn().mockRejectedValue(new Error('offline')));
    await act(async () => {
      await result.current.agree();
    });
    expect(result.current.failure).toBeNull();
    expect(mockLogError).toHaveBeenCalledWith('useContactsSync', 'refresh', expect.anything());
  });
});
