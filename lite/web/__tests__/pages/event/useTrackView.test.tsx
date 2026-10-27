import { waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LITE_TRACK_EVENT_VIEW } from '../../../graphql/events';
import { useTrackView } from '../../../pages/event/useTrackView';
import { renderHookWithProviders, settle } from '../../test-utils';

const SEEN_KEY = 'lite_seen_events';

/** A counted view for `slug`, with a spy on every time the API is actually asked. */
function trackMock(slug: string) {
  const answer = vi.fn(() => ({ data: { liteTrackEventView: true } }));
  const mock: MockedResponse = { request: { query: LITE_TRACK_EVENT_VIEW, variables: { slug } }, result: answer, maxUsageCount: Number.POSITIVE_INFINITY };
  return { answer, mock };
}

describe('useTrackView', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('counts the first view of an event in this tab and remembers it', async () => {
    const { answer, mock } = trackMock('garden-party');
    renderHookWithProviders(() => useTrackView('garden-party', false), { mocks: [mock] });

    await waitFor(() => expect(answer).toHaveBeenCalledTimes(1));
    expect(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]')).toEqual(['garden-party']);
  });

  it('does not count the same event twice in one tab session', async () => {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(['garden-party']));
    const { answer, mock } = trackMock('garden-party');
    renderHookWithProviders(() => useTrackView('garden-party', false), { mocks: [mock] });

    await settle();
    expect(answer).not.toHaveBeenCalled();
  });

  it('counts a different event even when another one was already seen', async () => {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(['garden-party']));
    const { answer, mock } = trackMock('rooftop-gig');
    renderHookWithProviders(() => useTrackView('rooftop-gig', false), { mocks: [mock] });

    await waitFor(() => expect(answer).toHaveBeenCalledTimes(1));
    expect(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]')).toEqual(['garden-party', 'rooftop-gig']);
  });

  it('never counts the host looking at their own event, and does not mark it seen', async () => {
    const { answer, mock } = trackMock('garden-party');
    renderHookWithProviders(() => useTrackView('garden-party', true), { mocks: [mock] });

    await settle();
    expect(answer).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(SEEN_KEY)).toBeNull();
  });

  it('does nothing before the slug is known', async () => {
    // Any request would find no answer here and be logged as an uncounted view.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderHookWithProviders(() => useTrackView(undefined, false));

    await settle();
    expect(warn).not.toHaveBeenCalledWith('[lite] page view not counted', expect.anything());
    expect(sessionStorage.getItem(SEEN_KEY)).toBeNull();
  });

  it('still counts the view when session storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: storage is disabled');
    });
    const { answer, mock } = trackMock('garden-party');
    renderHookWithProviders(() => useTrackView('garden-party', false), { mocks: [mock] });

    await waitFor(() => expect(answer).toHaveBeenCalledTimes(1));
  });

  it('logs a failed count instead of surfacing it to the visitor', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failing: MockedResponse = { request: { query: LITE_TRACK_EVENT_VIEW, variables: { slug: 'garden-party' } }, error: new Error('API down') };
    renderHookWithProviders(() => useTrackView('garden-party', false), { mocks: [failing] });

    await waitFor(() => expect(warn).toHaveBeenCalledWith('[lite] page view not counted', expect.objectContaining({ message: 'API down' })));
  });
});
