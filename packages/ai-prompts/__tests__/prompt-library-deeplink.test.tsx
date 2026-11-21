/**
 * Opening one prompt from a link — the AI Features table links each feature's
 * code prompts to the library as `?prompt=<key>`, and the page opens that
 * prompt's full dialog on arrival.
 *
 * What has to hold: only an EXACT key match opens (the search filter also
 * matches neighbours); an unknown key says so instead of opening the wrong
 * prompt; a failed read surfaces the API error; closing the dialog tells the
 * page so it can drop the key from its URL. Also: a code prompt whose live text
 * drifted from its default is marked Edited.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AI_PROMPTS } from '../src/queries';
import { PromptLibraryView } from '../src/mui/PromptLibraryView';
import { API_ORIGIN, installGridViewport, prompt, renderInPortal, settle } from './support/harness';

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

const searchMock = (key: string, answer: MockedResponse['result'] | Error): MockedResponse => ({
  request: { query: AI_PROMPTS, variables: { filter: { search: key } } },
  ...(answer instanceof Error ? { error: answer } : { result: answer }),
});

const dialog = () => document.body.querySelector('[role="dialog"]');

describe('PromptLibraryView opened from a link', () => {
  it('opens the prompt whose key matches exactly, not a neighbour the search also found', async () => {
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey="moderation.pod" />, [
      listMock([]),
      searchMock('moderation.pod', { data: { aiPrompts: [POD_USER, POD] } }),
    ]);
    await settle();

    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(screen.getByDisplayValue('Pod content safety review')).toBeDefined();
    expect(screen.queryByDisplayValue('Pod review — submitted content')).toBeNull();
  });

  it('tells the page when the linked prompt is closed, so it can drop the key', async () => {
    const onPromptClose = vi.fn();
    renderInPortal(
      <PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey="moderation.pod" onPromptClose={onPromptClose} />,
      [listMock([]), searchMock('moderation.pod', { data: { aiPrompts: [POD] } })],
    );
    await waitFor(() => expect(dialog()).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onPromptClose).toHaveBeenCalledTimes(1);
  });

  it('closes cleanly when the page passed no close handler', async () => {
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey="moderation.pod" />, [
      listMock([]),
      searchMock('moderation.pod', { data: { aiPrompts: [POD] } }),
    ]);
    await waitFor(() => expect(dialog()).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByDisplayValue('Pod content safety review')).toBeNull());
  });

  it('says the key is unknown instead of opening anything', async () => {
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey="gone.prompt" />, [
      listMock([]),
      searchMock('gone.prompt', { data: { aiPrompts: [POD] } }),
    ]);

    expect(await screen.findByText('No prompt with the key gone.prompt is in the AI Library.')).toBeDefined();
    expect(dialog()).toBeNull();
  });

  it('surfaces a failed read as the API error', async () => {
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey="moderation.pod" />, [
      listMock([]),
      searchMock('moderation.pod', { errors: [new GraphQLError('Access Denied')] }),
    ]);

    expect(await screen.findByText(/Access Denied/)).toBeDefined();
    expect(dialog()).toBeNull();
  });

  it('opens nothing and reads nothing extra without a key', async () => {
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} openPromptKey={null} />, [listMock([POD])]);
    await screen.findByText('Pod content safety review');

    expect(dialog()).toBeNull();
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
