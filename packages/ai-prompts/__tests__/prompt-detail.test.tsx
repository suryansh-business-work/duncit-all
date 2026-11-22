/**
 * The detail view a library row opens: the whole prompt and its size, and
 * ChatGPT's review of it — asked for automatically when the current body has
 * none, never paid for twice for the same body, and re-asked only on "Rescore".
 */
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptDetailDialog } from '../src/mui/PromptDetail';
import { QualityPanel, qualityBand } from '../src/mui/PromptDetail/QualityPanel';
import { AI_PROMPT_DETAIL } from '../src/detailQueries';
import { prompt, renderInPortal, settle } from './support/harness';
import { QUALITY, detailMock, detailOf, eventMocks, scoreMock } from './support/detail-fixtures';

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

const openDetail = (mocks: readonly MockedResponse[], props: Partial<Parameters<typeof PromptDetailDialog>[0]> = {}) => {
  const handlers = { onClose: vi.fn(), onEdit: vi.fn(), onChanged: vi.fn() };
  renderInPortal(
    <PromptDetailDialog promptId={ROW.id} portalOrigin="https://ai.duncit.com" {...handlers} {...props} />,
    [...mocks, ...eventMocks(ROW.id)],
  );
  return handlers;
};

describe('PromptDetailDialog overview', () => {
  it('shows the whole prompt, its size, hits, model and category, and copies it', async () => {
    openDetail([detailMock(detailOf(ROW))]);

    expect(await screen.findByRole('heading', { level: 2, name: ROW.name })).toBeDefined();
    expect(screen.getByLabelText('Full prompt').textContent).toBe(ROW.content);
    expect(screen.getByText('≈ 42 tokens')).toBeDefined();
    expect(screen.getByText('3 hits')).toBeDefined();
    expect(screen.getByText('Model: claude-opus-5')).toBeDefined();
    expect(screen.getByText('Category: Navigation')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ROW.content));
  });

  it('names the default model and a single hit in the singular', async () => {
    openDetail([detailMock(detailOf({ ...ROW, target_model: '', updated_at: null }, { total_hits: 1 }))]);

    expect(await screen.findByText('1 hit')).toBeDefined();
    expect(screen.getByText('Model: Default')).toBeDefined();
    // No edit time on record, so no 'Updated' line rather than a blank one.
    expect(screen.queryByText(/^Updated /)).toBeNull();
  });

  it('still lets the operator carry on when the clipboard refuses', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    openDetail([detailMock(detailOf(ROW))]);
    fireEvent.click(await screen.findByRole('button', { name: 'Copy prompt' }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.getByRole('heading', { level: 2, name: ROW.name })).toBeDefined();
  });

  it('hands the prompt to the editor, and closes on request', async () => {
    const handlers = openDetail([detailMock(detailOf(ROW))]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(handlers.onEdit).toHaveBeenCalledWith(ROW);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  it('says so when the prompt cannot be read', async () => {
    openDetail([{ request: { query: AI_PROMPT_DETAIL, variables: { id: ROW.id } }, error: new Error('offline') }]);

    expect(await screen.findByText('Could not load this prompt.')).toBeDefined();
  });

  it('shows the library title and no tabs when the server has no such prompt', async () => {
    openDetail([detailMock(null, ROW.id)]);

    expect(await screen.findByRole('heading', { level: 2, name: 'AI Library' })).toBeDefined();
    await settle();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('renders nothing while no prompt is open', () => {
    openDetail([], { promptId: null });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('PromptDetailDialog quality score', () => {
  it('asks ChatGPT for a review when the body has none, and shows it', async () => {
    openDetail([detailMock(detailOf(ROW, { quality: null })), scoreMock(ROW.id, false, { ...QUALITY, score: 64 })]);
    await screen.findByRole('heading', { level: 2, name: ROW.name });
    fireEvent.click(screen.getByRole('tab', { name: 'Quality score' }));

    expect(await screen.findByText('64')).toBeDefined();
    expect(screen.getByText('Fair')).toBeDefined();
    expect(screen.getByLabelText('Quality score 64 out of 100')).toBeDefined();
    expect(screen.getByText('Names its role')).toBeDefined();
    expect(screen.getByText('Say what to do with an empty map')).toBeDefined();
  });

  it('shows the stored review without asking again, and Rescore asks for a fresh one', async () => {
    openDetail([detailMock(detailOf(ROW)), scoreMock(ROW.id, true, { ...QUALITY, score: 91, summary: 'Even better.' })]);
    await screen.findByRole('heading', { level: 2, name: ROW.name });
    fireEvent.click(screen.getByRole('tab', { name: 'Quality score' }));
    expect(screen.getByText('86')).toBeDefined();
    expect(screen.getByText('Strong')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Rescore' }));

    expect(await screen.findByText('Even better.')).toBeDefined();
    expect(screen.getByText('91')).toBeDefined();
  });

  it('flags a review of an older body, and surfaces a refused review', async () => {
    openDetail([
      detailMock(detailOf(ROW, { quality: { ...QUALITY, stale: true } })),
      scoreMock(ROW.id, false, new Error('This AI feature is switched off in the AI portal')),
    ]);
    await screen.findByRole('heading', { level: 2, name: ROW.name });
    fireEvent.click(screen.getByRole('tab', { name: 'Quality score' }));
    await settle();

    expect(await screen.findByText(/switched off in the AI portal/)).toBeDefined();
    expect(screen.getByText(/review is of an earlier version/)).toBeDefined();
  });
});

describe('QualityPanel', () => {
  it('says the prompt is unreviewed when there is nothing to show yet', () => {
    renderInPortal(<QualityPanel quality={null} scoring={false} error={null} onRescore={vi.fn()} />);

    expect(screen.getByText('This prompt has not been reviewed yet.')).toBeDefined();
  });

  it('shows progress while a review is on its way and keeps Rescore off', () => {
    renderInPortal(<QualityPanel quality={null} scoring error={null} onRescore={vi.fn()} />);

    expect(screen.getByRole('status').textContent).toContain('reviewing');
    expect((screen.getByRole('button', { name: 'Rescore' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('bands a score: 80 and up strong, 50 and up fair, below that weak', () => {
    expect([qualityBand(100), qualityBand(80), qualityBand(79), qualityBand(50), qualityBand(49), qualityBand(0)]).toEqual([
      'strong',
      'strong',
      'fair',
      'fair',
      'weak',
      'weak',
    ]);
  });

  it('lists no reasons it was not given', () => {
    renderInPortal(
      <QualityPanel quality={{ ...QUALITY, score: 20, strengths: [], improvements: [] }} scoring={false} error={null} onRescore={vi.fn()} />,
    );

    expect(screen.getByText('Needs work')).toBeDefined();
    expect(screen.queryByText('What works')).toBeNull();
    expect(screen.queryByText('What to improve')).toBeNull();
  });
});
