/**
 * Opening one prompt's details — from a link (the AI Features table links each
 * feature's code prompts as `?prompt=<key>`) or by clicking its row.
 *
 * What has to hold: only an EXACT key match opens (the search filter also
 * matches neighbours); a prompt in the archive is still found; an unknown key
 * says so instead of opening the wrong prompt; a failed read surfaces the API
 * error; closing tells the page so it can drop the key from its URL; a row
 * click asks the page to put the key in the URL when it can, and opens the
 * details itself when it cannot. Also: a code prompt whose live text drifted
 * from its default is marked Edited.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AI_PROMPTS } from '../src/queries';
import { PromptLibraryView } from '../src/mui/PromptLibraryView';
import { API_ORIGIN, installGridViewport, prompt, renderInPortal, rowAction, settle } from './support/harness';
import { detailMock, detailOf, eventMocks, searchMocks } from './support/detail-fixtures';

vi.mock('@duncit/tabs', () => import('./support/tabs-stub'));

let restoreViewport: () => void;
beforeAll(() => {
  restoreViewport = installGridViewport();
});
afterAll(() => {
  restoreViewport();
});
afterEach(() => {
  vi.clearAllMocks();
});

const POD = prompt({ id: 'p-9', key: 'moderation.pod', name: 'Pod content safety review' });
const POD_USER = prompt({ id: 'p-10', key: 'moderation.pod.user', role: 'USER', name: 'Pod review — submitted content' });

const listMock = (rows: readonly (typeof POD)[]): MockedResponse => ({
  request: { query: AI_PROMPTS, variables: { filter: { kind: 'CODE' } } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { aiPrompts: rows } },
});

const detailFor = (row: typeof POD) => [detailMock(detailOf(row)), ...eventMocks(row.id)];
const heading = () => screen.queryByRole('heading', { level: 2, name: 'Pod content safety review' });

describe('PromptLibraryView opened from a link', () => {
  it('opens the details of the prompt whose key matches exactly, not a neighbour the search also found', async () => {
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey="moderation.pod" />, [
      listMock([]),
      ...searchMocks('moderation.pod', [POD_USER, POD]),
      ...detailFor(POD),
    ]);

    await waitFor(() => expect(heading()).not.toBeNull());
    expect(screen.getByText('moderation.pod')).toBeDefined();
    expect(screen.queryByRole('heading', { level: 2, name: 'Pod review — submitted content' })).toBeNull();
  });

  it('finds a prompt that was archived, which the live list leaves out', async () => {
    const archived = { ...POD, kind: 'AI' as const, archived_at: '2026-11-20T00:00:00.000Z' };
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey="moderation.pod" />, [
      listMock([]),
      ...searchMocks('moderation.pod', [], [archived]),
      detailMock(detailOf(archived, { archived_at: archived.archived_at, archived_by_name: 'Meera Rao' })),
      ...eventMocks(POD.id),
    ]);

    expect(await screen.findByText(/Archived by Meera Rao/)).toBeDefined();
    // Read-only until restored: no Edit while it is archived.
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('tells the page when the details close, so it can drop the key', async () => {
    const onPromptClose = vi.fn();
    renderInPortal(
      <PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey="moderation.pod" onPromptClose={onPromptClose} />,
      [listMock([]), ...searchMocks('moderation.pod', [POD]), ...detailFor(POD)],
    );
    await waitFor(() => expect(heading()).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onPromptClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(heading()).toBeNull());
  });

  it('closes cleanly when the page passed no close handler', async () => {
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey="moderation.pod" />, [
      listMock([]),
      ...searchMocks('moderation.pod', [POD]),
      ...detailFor(POD),
    ]);
    await waitFor(() => expect(heading()).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(heading()).toBeNull());
  });

  it('says the key is unknown instead of opening anything', async () => {
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey="gone.prompt" />, [
      listMock([]),
      ...searchMocks('gone.prompt', [POD], []),
    ]);

    expect(await screen.findByText('No prompt with the key gone.prompt is in the AI Library.')).toBeDefined();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('surfaces a failed read as the API error', async () => {
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey="moderation.pod" />, [
      listMock([]),
      { request: { query: AI_PROMPTS, variables: { filter: { search: 'moderation.pod' } } }, result: { errors: [new GraphQLError('Access Denied')] } },
      searchMocks('moderation.pod', [])[1],
    ]);

    expect(await screen.findByText(/Access Denied/)).toBeDefined();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens nothing and reads nothing extra without a key', async () => {
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey={null} />, [listMock([POD])]);
    await screen.findByText('Pod content safety review');

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('PromptLibraryView opened from a row', () => {
  it('asks the page to put the clicked prompt in the URL, and Public share lands on the Share tab', async () => {
    const onPromptOpen = vi.fn();
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} onPromptOpen={onPromptOpen} />, [listMock([POD])]);
    await screen.findByText('Pod content safety review');
    await rowAction('Pod content safety review', 'Open details');
    expect(onPromptOpen).toHaveBeenLastCalledWith('moderation.pod', undefined);

    await rowAction('Pod content safety review', 'Public share');
    expect(onPromptOpen).toHaveBeenLastCalledWith('moderation.pod', 'share');
  });

  it('opens a prompt that has no key yet itself, since there is nothing to put in the URL', async () => {
    const draft = prompt({ id: 'p-4', key: null, kind: 'AI', name: 'Feedback summariser' });
    const onPromptOpen = vi.fn();
    globalThis.window.history.replaceState(null, '', '/?selectedtab=AI');
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} onPromptOpen={onPromptOpen} />, [
      { request: { query: AI_PROMPTS, variables: { filter: { kind: 'AI' } } }, maxUsageCount: Number.POSITIVE_INFINITY, result: { data: { aiPrompts: [draft] } } },
      detailMock(detailOf(draft)),
      ...eventMocks(draft.id),
    ]);
    await screen.findByText('Feedback summariser');

    await rowAction('Feedback summariser', 'Open details');

    expect(await screen.findByRole('heading', { level: 2, name: 'Feedback summariser' })).toBeDefined();
    expect(onPromptOpen).not.toHaveBeenCalled();
    globalThis.window.history.replaceState(null, '', '/');
  });

  it('opens the details itself when the page keeps no URL for them', async () => {
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} />, [listMock([POD]), ...detailFor(POD)]);
    await screen.findByText('Pod content safety review');

    await rowAction('Pod content safety review', 'Open details');
    await settle();

    await waitFor(() => expect(heading()).not.toBeNull());
  });
});

describe('the Edited marker', () => {
  it('marks a code prompt whose live text differs from its default, and only that one', async () => {
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} />, [
      listMock([POD, { ...POD_USER, matches_default: false }]),
    ]);
    await screen.findByText('Pod content safety review');

    expect(screen.getAllByText('Edited')).toHaveLength(1);
  });
});
