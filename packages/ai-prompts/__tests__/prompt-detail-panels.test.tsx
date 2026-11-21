/**
 * The detail view's History, Analytics and Share tabs: restoring a version
 * (after a confirm, as a new version), reading who used the prompt and from
 * where, and the public link's whole life — on, copied, replaced, off.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptDetailDialog } from '../src/mui/PromptDetail';
import { HistoryPanel } from '../src/mui/PromptDetail/HistoryPanel';
import { DISABLE_AI_PROMPT_SHARE, ENABLE_AI_PROMPT_SHARE, RESTORE_AI_PROMPT_VERSION } from '../src/detailQueries';
import type { PromptAnalytics, PromptShare } from '../src/detailTypes';
import { prompt, renderInPortal, settle } from './support/harness';
import { EMPTY_ANALYTICS, analyticsMock, detailMock, detailOf, eventMocks } from './support/detail-fixtures';

vi.mock('@duncit/tabs', () => import('./support/tabs-stub'));

const writeText = vi.fn<(text: string) => Promise<void>>();
beforeEach(() => {
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
});
afterEach(() => {
  vi.clearAllMocks();
});

const ROW = prompt();
const PORTAL = 'https://ai.duncit.com';
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWx';
const SHARED: PromptShare = { enabled: true, token: TOKEN, shared_at: '2026-11-21T09:00:00.000Z', shared_by_name: 'Asha Rao' };

const open = async (mocks: readonly MockedResponse[], tab: string) => {
  const handlers = { onClose: vi.fn(), onEdit: vi.fn(), onChanged: vi.fn() };
  renderInPortal(<PromptDetailDialog promptId={ROW.id} portalOrigin={PORTAL} {...handlers} />, [...mocks, ...eventMocks(ROW.id)]);
  await screen.findByRole('heading', { level: 2, name: ROW.name });
  fireEvent.click(screen.getByRole('tab', { name: tab }));
  return handlers;
};

const confirmDialog = () => screen.getAllByRole('dialog').at(-1) as HTMLElement;

describe('History', () => {
  it('lists versions newest first, and restores an older one after confirming', async () => {
    const restore: MockedResponse = {
      request: { query: RESTORE_AI_PROMPT_VERSION, variables: { id: ROW.id, version: 1 } },
      result: { data: { restoreAiPromptVersion: { id: ROW.id, content: 'The first draft.' } } },
    };
    const handlers = await open([detailMock(detailOf(ROW)), restore], 'History');

    expect(screen.getByText('Current')).toBeDefined();
    expect(screen.getByText(/by Asha Rao/)).toBeDefined();
    expect(screen.getByText(/by the system/)).toBeDefined();
    expect(screen.getByText('Changed: content')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Version 1' }));
    // Second thoughts first: Cancel runs nothing.
    fireEvent.click(await screen.findByRole('button', { name: 'Restore this version' }));
    fireEvent.click(within(confirmDialog()).getByRole('button', { name: 'Cancel' }));
    await settle();
    expect(handlers.onChanged).not.toHaveBeenCalled();

    // The confirm's exit keeps the dialog behind it aria-hidden for a moment.
    fireEvent.click(await screen.findByRole('button', { name: 'Restore this version' }));
    expect(within(confirmDialog()).getByText(/Copy version 1 back into the prompt/)).toBeDefined();
    fireEvent.click(within(confirmDialog()).getByRole('button', { name: 'Restore this version' }));

    await waitFor(() => expect(handlers.onChanged).toHaveBeenCalledTimes(1));
  });

  it('surfaces a refused restore', async () => {
    const refused: MockedResponse = {
      request: { query: RESTORE_AI_PROMPT_VERSION, variables: { id: ROW.id, version: 1 } },
      error: new Error('This prompt needs {{navigation_map}} in the body'),
    };
    const handlers = await open([detailMock(detailOf(ROW)), refused], 'History');
    fireEvent.click(screen.getByRole('button', { name: 'Version 1' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Restore this version' }));
    fireEvent.click(within(confirmDialog()).getByRole('button', { name: 'Restore this version' }));

    expect(await screen.findByText(/needs \{\{navigation_map\}\}/)).toBeDefined();
    expect(handlers.onChanged).not.toHaveBeenCalled();
  });

  it('says history starts with the next change when there is none yet', () => {
    renderInPortal(<HistoryPanel versions={[]} restoring={false} onRestore={vi.fn()} />);

    expect(screen.getByText(/History starts with the next change/)).toBeDefined();
  });
});

const STATS: PromptAnalytics = {
  range_days: 30,
  total_hits: 5,
  unique_visitors: 2,
  by_type: [{ key: 'OPEN_IN_PLATFORM', count: 3 }, { key: 'SOMETHING_NEW', count: 2 }],
  by_platform: [{ key: 'CLAUDE', count: 2 }, { key: 'NEWBOT', count: 1 }],
  by_source: [{ key: 'newsletter', count: 4 }],
  by_device: [{ key: 'mobile', count: 4 }, { key: 'watch', count: 1 }],
  by_day: [{ day: '2026-11-20', count: 1 }, { day: '2026-11-21', count: 4 }],
};

describe('Analytics', () => {
  it('shows totals, a bar per day, and each breakdown under its own labels', async () => {
    await open([detailMock(detailOf(ROW)), analyticsMock(ROW.id, 30, STATS)], 'Analytics');

    expect(await screen.findByText('Unique visitors')).toBeDefined();
    expect(screen.getByText('3 hits all time', { exact: false })).toBeDefined();
    expect(screen.getAllByRole('img', { name: /hits?$/ })).toHaveLength(2);
    expect(screen.getByText('Opened in an LLM')).toBeDefined();
    // A key this build has no label for still shows, as stored.
    expect(screen.getByText('SOMETHING_NEW')).toBeDefined();
    expect(screen.getByText('Claude')).toBeDefined();
    expect(screen.getByText('NEWBOT')).toBeDefined();
    expect(screen.getByText('newsletter')).toBeDefined();
    expect(screen.getByText('Mobile')).toBeDefined();
    expect(screen.getByText('watch')).toBeDefined();
  });

  it('reads another range on request, and says when it is empty', async () => {
    await open([detailMock(detailOf(ROW, { last_hit_at: null })), analyticsMock(ROW.id, 30, STATS), analyticsMock(ROW.id, 7, { ...EMPTY_ANALYTICS, range_days: 7 })], 'Analytics');
    await screen.findByText('Unique visitors');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Range' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Last 7 days' }));

    expect(await screen.findByText('No interactions in this range yet.')).toBeDefined();
  });

  it('says so when the analytics cannot be read', async () => {
    await open([detailMock(detailOf(ROW)), analyticsMock(ROW.id, 30, new Error('timeout'))], 'Analytics');

    expect(await screen.findByText('Could not load the analytics.')).toBeDefined();
  });
});

describe('Share', () => {
  it('shows a live public link, copies it, and replaces it after a confirm', async () => {
    const regenerate: MockedResponse = {
      request: { query: ENABLE_AI_PROMPT_SHARE, variables: { id: ROW.id, regenerate: true } },
      result: { data: { enableAiPromptPublicShare: { ...SHARED, token: 'ZyXwVuTsRqPoNmLkJiHgFeDc' } } },
    };
    await open([detailMock(detailOf(ROW, { share: SHARED })), regenerate], 'Share');

    expect(screen.getByText(`${PORTAL}/p/${TOKEN}`)).toBeDefined();
    expect(screen.getByText(/Shared by Asha Rao/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Copy public link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${PORTAL}/p/${TOKEN}`));

    fireEvent.click(screen.getByRole('button', { name: 'Copy library link' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenLastCalledWith(`${PORTAL}/library?selectedtab=CODE&prompt=ask-bot.navigation`),
    );

    writeText.mockRejectedValueOnce(new Error('blocked'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy public link' }));
    await settle();

    // Second thoughts first: Cancel keeps the link people already have.
    fireEvent.click(screen.getByRole('button', { name: 'New link' }));
    fireEvent.click(within(confirmDialog()).getByRole('button', { name: 'Cancel' }));
    await settle();

    fireEvent.click(await screen.findByRole('button', { name: 'New link' }));
    expect(within(confirmDialog()).getByText(/stops working straight away/)).toBeDefined();
    fireEvent.click(within(confirmDialog()).getByRole('button', { name: 'New link' }));
    await settle();

    // The hand-off from here is counted against the prompt, with its platform.
    const openWindow = vi.fn();
    vi.stubGlobal('open', openWindow);
    fireEvent.click(await screen.findByRole('button', { name: 'Open in Claude' }));
    await waitFor(() => expect(openWindow).toHaveBeenCalledTimes(1));
    vi.unstubAllGlobals();
  });

  it('turns the link on from the switch', async () => {
    const enable: MockedResponse = {
      request: { query: ENABLE_AI_PROMPT_SHARE, variables: { id: ROW.id, regenerate: false } },
      result: { data: { enableAiPromptPublicShare: SHARED } },
    };
    // Switched off earlier: the token is kept, but no link is shown until it is on again.
    await open([detailMock(detailOf(ROW, { share: { ...SHARED, enabled: false } })), enable], 'Share');
    expect(screen.getByText('The public link is off.')).toBeDefined();
    expect(screen.queryByText(new RegExp(TOKEN))).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Turn on the public link' }));
    await settle();
    const errors = screen.queryAllByRole('alert').filter((alert) => alert.classList.contains('MuiAlert-colorError'));
    expect(errors).toEqual([]);
  });

  it('surfaces a refusal when the link is switched off', async () => {
    const disable: MockedResponse = {
      request: { query: DISABLE_AI_PROMPT_SHARE, variables: { id: ROW.id } },
      error: new Error('Restore this prompt from the archive before sharing it'),
    };
    await open([detailMock(detailOf(ROW, { share: { ...SHARED, shared_by_name: null } })), disable], 'Share');
    expect(screen.getByText(/^Shared on /)).toBeDefined();
    fireEvent.click(screen.getByRole('switch', { name: 'Public link is on' }));
    expect(await screen.findByText(/before sharing it/)).toBeDefined();
  });

  it('keeps an archived prompt from being shared, and offers no library link for a keyless one', async () => {
    await open([detailMock(detailOf({ ...ROW, key: null }, { archived_at: '2026-11-20T00:00:00.000Z' }))], 'Share');
    expect(screen.getByText(/^Archived on /)).toBeDefined();

    expect((screen.getByRole('switch', { name: 'Turn on the public link' }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Copy library link' })).toBeNull();
  });
});
