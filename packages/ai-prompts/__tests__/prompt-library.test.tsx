/**
 * The AI Library page and the dialog that edits one row.
 *
 * The distinction the page exists to keep visible is CODE vs AI: a code prompt
 * is declared in code and read back on every call, so it can be edited and
 * reset but never created or deleted here, while an AI prompt is written here
 * and owned by nobody in code. The dialog is the same one for both.
 */
import type { ReactElement } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PromptDialog } from '../src/mui/PromptDialog';
import { PromptLibraryView } from '../src/mui/PromptLibraryView';
import type { AiPrompt } from '../src/types';

const API_ORIGIN = 'https://server.duncit.com';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const prompt = (over: Partial<AiPrompt> = {}): AiPrompt =>
  (({
    id: 'p-1',
    key: 'ask-bot.navigation',
    kind: 'CODE',
    role: 'SYSTEM',
    name: 'Navigation Knowledge Bot',
    description: 'Answers where a page lives.',
    content: 'Use {{navigation_map}} to answer {{user_question}}.',
    category: 'Navigation',
    target_model: 'claude-opus-5',

    variables: [
      { name: 'navigation_map', required: true, example: '', description: 'The page catalogue' },
      { name: 'user_question', required: true, example: 'where do I add a venue?', description: '' },
    ],

    tasks: ['ask-bot'],
    usage: [],
    token_count: 42,
    is_active: true,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-02T00:00:00.000Z',
    ...over
  }) as AiPrompt);

const wrap = (ui: ReactElement) => render(<MockedProvider mocks={[]}>{ui}</MockedProvider>);

afterEach(() => {
  vi.clearAllMocks();
});

describe('PromptLibraryView', () => {
  it('renders with the catalogue still on its way', async () => {
    const { container } = wrap(<PromptLibraryView apiOrigin={API_ORIGIN} />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('shows the feed origin a caller outside the server would fetch from', async () => {
    const { container } = wrap(<PromptLibraryView apiOrigin={API_ORIGIN} />);
    await settle();
    await settle();

    expect(container.textContent).toContain('duncit.com');
  });

  it('survives every control on the page being pressed with nothing behind it', async () => {
    wrap(<PromptLibraryView apiOrigin={API_ORIGIN} />);
    await settle();

    for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 20)) {
      if (!control.isConnected) continue;
      fireEvent.click(control);
      await settle();
    }

    expect(document.body.innerHTML).not.toBe('');
  });
});

describe('PromptDialog', () => {
  it('renders nothing while it is closed', () => {
    wrap(<PromptDialog open={false} prompt={null} apiOrigin={API_ORIGIN} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens blank to write a new AI prompt', async () => {
    wrap(<PromptDialog open prompt={null} apiOrigin={API_ORIGIN} onClose={vi.fn()} onSaved={vi.fn()} />);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('prefills from the code prompt being edited, variables included', async () => {
    wrap(<PromptDialog open prompt={prompt()} apiOrigin={API_ORIGIN} onClose={vi.fn()} onSaved={vi.fn()} />);
    await settle();

    expect(document.body.textContent).toContain('navigation_map');
  });

  it('opens for an AI prompt, which has no declared variables to keep', async () => {
    wrap(
      <PromptDialog
        open
        prompt={prompt({ kind: 'AI', variables: [], key: null, role: 'USER' })}
        apiOrigin={API_ORIGIN}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('does not report a save when the body dropped a placeholder the call site fills in', async () => {
    const onSaved = vi.fn();
    wrap(<PromptDialog open prompt={prompt()} apiOrigin={API_ORIGIN} onClose={vi.fn()} onSaved={onSaved} />);
    await settle();

    for (const field of document.body.querySelectorAll<HTMLTextAreaElement>('textarea')) {
      fireEvent.change(field, { target: { value: 'Answer from memory, with no facts.' } });
    }
    await settle();

    for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 12)) {
      if (!control.isConnected) continue;
      fireEvent.click(control);
      await settle();
    }

    expect(onSaved).not.toHaveBeenCalled();
  });
});
