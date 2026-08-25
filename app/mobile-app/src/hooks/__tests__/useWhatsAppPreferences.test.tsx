/**
 * WhatsApp Preferences — the same sheet as Mail Preferences, one channel over.
 *
 * Same rules, and they hold for the same reasons: every mutation answers with
 * the whole sheet so what renders is always a state the server actually held,
 * and one save runs at a time keyed by the row that asked for it.
 *
 * The one difference is deliberate and worth pinning: there is no
 * `confirmationSent`. Mail confirms an opt-out by email, because email is
 * where a mistake is discovered; WhatsApp does not, so nothing here should
 * start claiming it does.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  MobileSetAllWhatsappPreferencesDocument,
  MobileSetWhatsappPreferenceDocument,
  MobileWhatsappPreferenceDocument,
} from '@/graphql/whatsapp-preference';
import { graphqlRequest } from '@/services/graphql.client';
import {
  ALL_WHATSAPP_CATEGORIES,
  useWhatsAppPreferences,
} from '@/hooks/useWhatsAppPreferences';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const sheet = (over: Record<string, unknown> = {}) => ({
  destination: '+919876543210',
  reachable: true,
  updated_at: '2026-08-20T10:00:00.000Z',
  categories: [
    { category: 'POD_REMINDERS', required: false, enabled: true },
    { category: 'MARKETING', required: false, enabled: true },
  ],
  ...over,
});

/** The same sheet with every category switched off — what a bulk opt-out answers with. */
const allOff = () =>
  sheet({ categories: sheet().categories.map((row) => ({ ...row, enabled: false })) });

const loaded = (value = sheet()) => mockRequest.mockResolvedValue({ myWhatsappPreference: value });

beforeEach(() => {
  mockRequest.mockReset();
});

describe('useWhatsAppPreferences — loading', () => {
  it('asks for the signed-in member’s sheet and hands it back', async () => {
    loaded();

    const { result } = renderHook(() => useWhatsAppPreferences());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preference?.destination).toBe('+919876543210');
    expect(result.current.loadFailed).toBe(false);
    expect(mockRequest).toHaveBeenCalledWith(MobileWhatsappPreferenceDocument, undefined, {
      auth: true,
    });
  });

  it('says it could not load rather than showing an empty sheet', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useWhatsAppPreferences());

    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.preference).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('drops the answer when the screen has already gone', async () => {
    let settle: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => useWhatsAppPreferences());
    unmount();
    await act(async () => {
      settle({ myWhatsappPreference: sheet() });
    });

    expect(result.current.preference).toBeNull();
  });
});

describe('useWhatsAppPreferences — saving', () => {
  it('renders the sheet the server answered with, not the toggle that was pressed', async () => {
    loaded();
    const { result } = renderHook(() => useWhatsAppPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const answered = sheet({
      categories: [{ category: 'MARKETING', required: false, enabled: false }],
    });
    mockRequest.mockResolvedValueOnce({ setMyWhatsappPreference: answered });

    await act(async () => {
      await result.current.setCategory('MARKETING', false);
    });

    expect(result.current.preference?.categories).toEqual(answered.categories);
    expect(result.current.saved).toBe(true);
    expect(mockRequest).toHaveBeenLastCalledWith(
      MobileSetWhatsappPreferenceDocument,
      { category: 'MARKETING', enabled: false },
      { auth: true },
    );
  });

  it('turns everything off under one key, so only the bulk control goes busy', async () => {
    loaded();
    const { result } = renderHook(() => useWhatsAppPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let release: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.setAll(false);
    });
    await waitFor(() => expect(result.current.busyCategory).toBe(ALL_WHATSAPP_CATEGORIES));

    await act(async () => {
      release({ setAllMyWhatsappPreferences: allOff() });
      await pending;
    });

    expect(result.current.busyCategory).toBeNull();
    expect(result.current.preference?.categories.every((row) => !row.enabled)).toBe(true);
    expect(mockRequest).toHaveBeenLastCalledWith(
      MobileSetAllWhatsappPreferencesDocument,
      { enabled: false },
      { auth: true },
    );
  });

  it('refuses a second save while one is in flight', async () => {
    loaded();
    const { result } = renderHook(() => useWhatsAppPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let release: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.setCategory('MARKETING', false);
    });
    await waitFor(() => expect(result.current.busyCategory).toBe('MARKETING'));

    const callsBefore = mockRequest.mock.calls.length;
    await act(async () => {
      await result.current.setCategory('POD_REMINDERS', false);
    });
    expect(mockRequest.mock.calls).toHaveLength(callsBefore);

    await act(async () => {
      release({ setMyWhatsappPreference: sheet() });
      await first;
    });
  });

  it('flags a failed save without throwing the transport string at the reader', async () => {
    loaded();
    const { result } = renderHook(() => useWhatsAppPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockRequest.mockRejectedValueOnce(new Error('502 Bad Gateway'));
    await act(async () => {
      await result.current.setCategory('MARKETING', false);
    });

    expect(result.current.saveFailed).toBe(true);
    expect(result.current.saved).toBe(false);
    expect(result.current.busyCategory).toBeNull();
  });

  it('clears the saved note once it has been read', async () => {
    loaded();
    const { result } = renderHook(() => useWhatsAppPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockRequest.mockResolvedValueOnce({ setMyWhatsappPreference: sheet() });
    await act(async () => {
      await result.current.setCategory('MARKETING', true);
    });
    expect(result.current.saved).toBe(true);

    act(() => {
      result.current.dismissSaved();
    });
    expect(result.current.saved).toBe(false);
  });
});
