/**
 * Mail Preferences — what a member is willing to be emailed about.
 *
 * Every mutation answers with the WHOLE sheet, and the hook renders that
 * answer rather than merging a local change into what it already had. Two
 * devices toggling at once therefore cannot leave a screen showing a state the
 * server never held — which is the failure this shape exists to prevent, and
 * most of what these tests pin.
 *
 * The other rule is the busy lock: one save at a time, keyed by the row that
 * asked, so a bulk switch can go busy without every individual row's switch
 * doing so.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  MobileMailPreferencesDocument,
  MobileSetAllMailPreferencesDocument,
  MobileSetMailPreferenceDocument,
} from '@/graphql/mail-preference';
import { graphqlRequest } from '@/services/graphql.client';
import { ALL_CATEGORIES, useMailPreferences } from '@/hooks/useMailPreferences';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const sheet = (over: Record<string, unknown> = {}) => ({
  email: 'meera@duncit.com',
  updated_at: '2026-08-20T10:00:00.000Z',
  categories: [
    { category: 'POD_UPDATES', required: false, enabled: true },
    { category: 'MARKETING', required: false, enabled: true },
  ],
  ...over,
});

/** The same sheet with every category switched off — what a bulk opt-out answers with. */
const allOff = () =>
  sheet({ categories: sheet().categories.map((row) => ({ ...row, enabled: false })) });

const loaded = (value = sheet()) => mockRequest.mockResolvedValue({ myMailPreferences: value });

beforeEach(() => {
  mockRequest.mockReset();
});

describe('useMailPreferences — loading', () => {
  it('asks for the signed-in member’s sheet and hands it back', async () => {
    loaded();

    const { result } = renderHook(() => useMailPreferences());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preference?.email).toBe('meera@duncit.com');
    expect(result.current.loadFailed).toBe(false);
    expect(mockRequest).toHaveBeenCalledWith(MobileMailPreferencesDocument, undefined, {
      auth: true,
    });
  });

  it('says it could not load rather than showing an empty sheet', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useMailPreferences());

    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.isLoading).toBe(false);
    // An empty sheet would read as "you have opted out of everything".
    expect(result.current.preference).toBeNull();
  });

  it('drops the answer when the screen has already gone', async () => {
    let settle: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => useMailPreferences());
    unmount();
    await act(async () => {
      settle({ myMailPreferences: sheet() });
    });

    expect(result.current.preference).toBeNull();
  });
});

describe('useMailPreferences — saving', () => {
  it('renders the sheet the server answered with, not the toggle that was pressed', async () => {
    loaded();
    const { result } = renderHook(() => useMailPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const answered = sheet({
      categories: [{ category: 'MARKETING', required: false, enabled: false }],
    });
    mockRequest.mockResolvedValueOnce({ setMyMailPreference: answered });

    await act(async () => {
      await result.current.setCategory('MARKETING', false);
    });

    expect(result.current.preference?.categories).toEqual(answered.categories);
    expect(result.current.saved).toBe(true);
    expect(mockRequest).toHaveBeenLastCalledWith(
      MobileSetMailPreferenceDocument,
      { category: 'MARKETING', enabled: false },
      { auth: true },
    );
  });

  /**
   * The server confirms by email on the way OUT only — an opt-in needs no
   * "you are now receiving this" note, and sending one would be the thing the
   * member just asked to stop.
   */
  it('expects a confirmation email on an opt-out, and none on an opt-in', async () => {
    loaded();
    const { result } = renderHook(() => useMailPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockRequest.mockResolvedValueOnce({ setMyMailPreference: sheet() });
    await act(async () => {
      await result.current.setCategory('MARKETING', false);
    });
    expect(result.current.confirmationSent).toBe(true);

    mockRequest.mockResolvedValueOnce({ setMyMailPreference: sheet() });
    await act(async () => {
      await result.current.setCategory('MARKETING', true);
    });
    expect(result.current.confirmationSent).toBe(false);
  });

  it('turns everything off under one key, so only the bulk control goes busy', async () => {
    loaded();
    const { result } = renderHook(() => useMailPreferences());
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
    await waitFor(() => expect(result.current.busyCategory).toBe(ALL_CATEGORIES));

    await act(async () => {
      release({ setAllMyMailPreferences: allOff() });
      await pending;
    });

    expect(result.current.busyCategory).toBeNull();
    expect(result.current.preference?.categories.every((row) => !row.enabled)).toBe(true);
    expect(mockRequest).toHaveBeenLastCalledWith(
      MobileSetAllMailPreferencesDocument,
      { enabled: false },
      { auth: true },
    );
  });

  it('refuses a second save while one is in flight', async () => {
    loaded();
    const { result } = renderHook(() => useMailPreferences());
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
      await result.current.setCategory('POD_UPDATES', false);
    });
    // The second press sent nothing — two saves racing would answer with two
    // sheets and the loser would be what renders.
    expect(mockRequest.mock.calls).toHaveLength(callsBefore);

    await act(async () => {
      release({ setMyMailPreference: sheet() });
      await first;
    });
  });

  it('flags a failed save without throwing the transport string at the reader', async () => {
    loaded();
    const { result } = renderHook(() => useMailPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockRequest.mockRejectedValueOnce(new Error('502 Bad Gateway'));
    await act(async () => {
      await result.current.setCategory('MARKETING', false);
    });

    expect(result.current.saveFailed).toBe(true);
    expect(result.current.saved).toBe(false);
    // Freed either way, or the row would stay stuck on its spinner.
    expect(result.current.busyCategory).toBeNull();
  });

  it('clears the saved note once it has been read', async () => {
    loaded();
    const { result } = renderHook(() => useMailPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockRequest.mockResolvedValueOnce({ setMyMailPreference: sheet() });
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
