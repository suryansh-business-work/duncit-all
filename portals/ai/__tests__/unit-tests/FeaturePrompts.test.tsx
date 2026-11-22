import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import FeaturePrompts from '../../src/pages/ai-features/FeaturePrompts';
import FeaturesTable from '../../src/pages/ai-features/FeaturesTable';
import type { AiFeature, AiFeaturePrompt } from '../../src/pages/ai-features/queries';
import { libraryPromptPath } from '../../src/lib/library-links';
import { renderWithProviders } from '../testkit';

vi.mock('@duncit/table', async () => ({
  ...(await import('./table-mock')),
  dateColumn: (options: object) => options,
}));

/**
 * The AI Features ↔ AI Library link: which code prompts a feature runs on, each
 * opening that prompt's full details in the library.
 *
 * What has to hold: every prompt links to `/library?prompt=<key>`; a prompt the
 * library edited away from its code default, or has not added yet, says so with
 * an icon and a name (never colour alone); a feature with no code prompt shows
 * why; and pressing a link inside a table row follows the link instead of also
 * opening the feature.
 */
const SYSTEM: AiFeaturePrompt = {
  key: 'moderation.pod',
  name: 'Pod content safety review',
  role: 'SYSTEM',
  in_library: true,
  matches_default: true,
};
const USER_EDITED: AiFeaturePrompt = {
  key: 'moderation.pod.user',
  name: 'Pod review — submitted content',
  role: 'USER',
  in_library: true,
  matches_default: false,
};
const PENDING: AiFeaturePrompt = { ...SYSTEM, key: 'support.assistant', name: 'Support reply', in_library: false };

describe('libraryPromptPath', () => {
  it('opens a code prompt on the Code tab, with its key encoded', () => {
    expect(libraryPromptPath('a b/c')).toBe('/library?selectedtab=CODE&prompt=a%20b%2Fc');
  });

  it('lands an AI prompt on the AI tab', () => {
    expect(libraryPromptPath('weekly-digest', 'AI')).toBe('/library?selectedtab=AI&prompt=weekly-digest');
  });
});

describe('FeaturePrompts', () => {
  it('links every prompt by key in a table cell, marking the edited one', () => {
    renderWithProviders(<FeaturePrompts feature={{ prompts: [SYSTEM, USER_EDITED], prompts_note: null }} variant="cell" />);

    const system = screen.getByRole('link', { name: 'Open Pod content safety review in the AI Library' });
    expect(system).toHaveAttribute('href', '/library?selectedtab=CODE&prompt=moderation.pod');
    expect(system).toHaveTextContent('moderation.pod');
    expect(system).toHaveAttribute('title', 'Pod content safety review · System turn');
    const user = screen.getByRole('link', { name: 'Open Pod review — submitted content in the AI Library' });
    expect(user).toHaveAttribute('href', '/library?selectedtab=CODE&prompt=moderation.pod.user');
    expect(user).toHaveAttribute('title', 'Pod review — submitted content · User turn');
    // Only the drifted prompt carries the marker, and it has a name, not just a colour.
    expect(screen.getAllByRole('img', { name: 'Edited' })).toHaveLength(1);
    expect(screen.queryByRole('img', { name: 'Not added yet' })).toBeNull();
  });

  it('says when the library has not added a prompt yet, without calling it edited', () => {
    renderWithProviders(<FeaturePrompts feature={{ prompts: [PENDING], prompts_note: null }} variant="cell" />);

    expect(screen.getByRole('img', { name: 'Not added yet' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Edited' })).toBeNull();
  });

  it('lists prompts by name with their key and turn on the feature page', () => {
    renderWithProviders(<FeaturePrompts feature={{ prompts: [SYSTEM, USER_EDITED], prompts_note: null }} variant="list" />);

    expect(screen.getByRole('link', { name: /Pod content safety review/ })).toHaveTextContent('Pod content safety review');
    expect(screen.getByText('moderation.pod · System turn')).toBeInTheDocument();
    expect(screen.getByText('moderation.pod.user · User turn')).toBeInTheDocument();
  });

  it('explains a feature that runs on no code prompt', () => {
    const note = 'Each AI reply step uses the AI Library prompt picked on that step in the flow builder.';
    renderWithProviders(<FeaturePrompts feature={{ prompts: [], prompts_note: note }} variant="cell" />);

    expect(screen.getByText(note)).toHaveAttribute('title', note);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders an empty note, not a crash, when the server gives no reason', () => {
    const { container } = renderWithProviders(<FeaturePrompts feature={{ prompts: [], prompts_note: null }} variant="list" />);

    expect(container.textContent).toBe('');
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('FeaturesTable — Code prompt column', () => {
  const row = (over: Partial<AiFeature>): AiFeature => ({
    key: 'moderation.pod',
    label: 'Pod moderation scan',
    module: 'Moderation',
    description: 'Screens a pod',
    when_off: 'Rule-based checks only',
    enabled: true,
    updated_by_name: null,
    updated_at: null,
    range_days: 30,
    calls: 3,
    failed_calls: 0,
    skipped_calls: 0,
    prompt_tokens: 10,
    completion_tokens: 5,
    total_tokens: 15,
    cost_usd: 0.01,
    avg_duration_ms: 200,
    unpriced_calls: 0,
    last_called_at: null,
    prompts: [SYSTEM, USER_EDITED],
    prompts_note: null,
    ...over,
  });

  it('shows each feature’s prompts, and a link press does not also open the feature', async () => {
    const onOpen = vi.fn();
    renderWithProviders(<FeaturesTable rows={[row({})]} pendingKey={null} onToggle={vi.fn()} onOpen={onOpen} />);

    const cell = await screen.findByTestId('cell-prompts');
    const link = within(cell).getByRole('link', { name: 'Open Pod content safety review in the AI Library' });
    fireEvent.click(link);

    expect(onOpen).not.toHaveBeenCalled();
  });

  it('finds a feature by one of its prompt keys', async () => {
    const other = row({ key: 'support.assistant', label: 'Support chat reply', prompts: [PENDING] });
    renderWithProviders(<FeaturesTable rows={[row({}), other]} pendingKey={null} onToggle={vi.fn()} onOpen={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));

    fireEvent.change(screen.getByLabelText('table-search'), { target: { value: 'moderation.pod.user' } });

    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(1));
    expect(screen.getByText('Pod moderation scan')).toBeInTheDocument();
  });
});
