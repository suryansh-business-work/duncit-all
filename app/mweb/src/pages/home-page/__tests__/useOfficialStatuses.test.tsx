import { act, renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { AppLocationProvider } from '../../../app/AppLocationContext';
import { OFFICIAL_STATUSES, RECORD_OFFICIAL_STATUS_VIEW } from '../queries';
import { useOfficialStatuses } from '../useOfficialStatuses';

const STATUSES = [
  {
    id: 'os1',
    media_url: 'https://x/a.jpg',
    media_type: 'IMAGE',
    caption: 'Hello',
    link_url: '/promo',
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    is_active: true,
    seen_by_me: false,
  },
  {
    id: 'os2',
    media_url: 'https://x/b.mp4',
    media_type: 'VIDEO',
    caption: '',
    link_url: '',
    expires_at: null,
    is_active: true,
    seen_by_me: true,
  },
];

const officialStatusesMock = (locationId: string | undefined, statuses: unknown[]) => ({
  request: { query: OFFICIAL_STATUSES, variables: { locationId } },
  result: { data: { officialStatuses: statuses } },
});

const recordViewMock = (id: string) => ({
  request: { query: RECORD_OFFICIAL_STATUS_VIEW, variables: { id } },
  result: { data: { recordOfficialStatusView: true } },
});

function wrapperWith(mocks: unknown[], locationId = 'loc9') {
  return ({ children }: { children: ReactNode }) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks as any}>
      <AppLocationProvider locationId={locationId} zoneName="">
        {children}
      </AppLocationProvider>
    </MockedProvider>
  );
}

describe('useOfficialStatuses', () => {
  it('returns a null entry before data resolves and once nothing is live for the city', async () => {
    const { result } = renderHook(() => useOfficialStatuses('Duncit', 'Duncit'), {
      wrapper: wrapperWith([officialStatusesMock('loc9', [])], 'loc9'),
    });
    expect(result.current.entry).toBeNull();
    await waitFor(() => expect(result.current.entry).toBeNull());
  });

  it('sends locationId undefined when the header has no city selected', async () => {
    const { result } = renderHook(() => useOfficialStatuses('Duncit', 'Duncit'), {
      wrapper: wrapperWith([officialStatusesMock(undefined, STATUSES)], ''),
    });
    await waitFor(() => expect(result.current.entry).not.toBeNull());
    expect(result.current.entry?.label).toBe('Duncit');
  });

  it('builds the pinned entry and greys the ring once the unseen slide is watched', async () => {
    const { result } = renderHook(() => useOfficialStatuses('Duncit', 'Status tile'), {
      wrapper: wrapperWith(
        [officialStatusesMock('loc9', STATUSES), recordViewMock('os1'), recordViewMock('os1')],
        'loc9',
      ),
    });

    await waitFor(() => expect(result.current.entry).not.toBeNull());
    expect(result.current.entry?.label).toBe('Status tile');
    expect(result.current.entry?.active).toBe(true);
    expect(result.current.entry?.viewer.slides?.map((slide) => slide.linkUrl)).toEqual(['/promo', '']);

    await act(async () => {
      result.current.recordView('os1');
    });
    await waitFor(() => expect(result.current.entry?.active).toBe(false));

    // Recording the same slide again is a no-op on the watched set, but the
    // mutation still fires every time recordView is invoked.
    await act(async () => {
      result.current.recordView('os1');
    });
    expect(result.current.entry?.active).toBe(false);
  });

  it('swallows a mutation failure so a lost network call never surfaces to the caller', async () => {
    const { result } = renderHook(() => useOfficialStatuses('Duncit', 'Duncit'), {
      wrapper: wrapperWith(
        [
          officialStatusesMock('loc9', [{ ...STATUSES[0], id: 'osx', seen_by_me: false }]),
          { request: { query: RECORD_OFFICIAL_STATUS_VIEW, variables: { id: 'osx' } }, error: new Error('network fail') },
        ],
        'loc9',
      ),
    });

    await waitFor(() => expect(result.current.entry).not.toBeNull());
    expect(result.current.entry?.active).toBe(true);

    await act(async () => {
      result.current.recordView('osx');
    });
    await waitFor(() => expect(result.current.entry?.active).toBe(false));
  });
});
