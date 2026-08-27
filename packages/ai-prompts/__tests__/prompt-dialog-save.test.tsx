/**
 * Saving through the dialog: what each kind actually sends.
 *
 * On a code prompt only the operator-owned fields go up — the catalogue owns
 * the identity and overwrites it on the next boot, so sending it would read
 * like it did something. An AI prompt sends everything, because here IS its
 * owner. The variable matching below is exact on purpose: it is the contract.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CREATE_AI_PROMPT, UPDATE_AI_PROMPT } from '../src/queries';
import { PromptDialog } from '../src/mui/PromptDialog';
import { PromptForm } from '../src/mui/PromptForm';
import { API_ORIGIN, prompt, renderInPortal, settle } from './support/harness';

afterEach(() => {
  vi.clearAllMocks();
});

const KEPT_BODY = 'Use {{navigation_map}} to answer {{user_question}}. Be brief.';

const setField = (name: string, value: string) => {
  const field = document.body.querySelector<HTMLElement>(`input[name="${name}"], textarea[name="${name}"]`);
  if (!field) throw new Error(`no field named ${name}`);
  fireEvent.change(field, { target: { value } });
};

const openAndEdit = async (row: ReturnType<typeof prompt> | null, mocks: readonly MockedResponse[]) => {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  renderInPortal(
    <PromptDialog open prompt={row} apiOrigin={API_ORIGIN} onClose={onClose} onSaved={onSaved} />,
    mocks,
  );
  await settle();
  return { onClose, onSaved };
};

const submitForm = async () => {
  fireEvent.submit(screen.getByTestId('prompt-form'));
  await settle();
  await settle();
};

describe('PromptDialog saving', () => {
  it('a code prompt sends ONLY the operator-owned fields', async () => {
    const update: MockedResponse = {
      request: {
        query: UPDATE_AI_PROMPT,
        variables: {
          id: 'p-1',
          input: {
            description: 'Answers where a page lives.',
            content: KEPT_BODY,
            target_model: 'claude-opus-5',
          },
        },
      },
      result: { data: { updateAiPrompt: { id: 'p-1' } } },
    };
    const { onClose, onSaved } = await openAndEdit(prompt(), [update]);

    setField('content', KEPT_BODY);
    await settle();
    await submitForm();

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('an AI prompt sends its identity too — this screen is its owner', async () => {
    const row = prompt({ kind: 'AI', role: 'USER', key: 'digest.weekly', variables: [], usage: [] });
    const update: MockedResponse = {
      request: {
        query: UPDATE_AI_PROMPT,
        variables: {
          id: 'p-1',
          input: {
            description: 'Answers where a page lives.',
            content: 'Write the Monday digest for {{club_name}}.',
            target_model: 'claude-opus-5',
            name: 'Navigation Knowledge Bot',
            category: 'Navigation',
            is_active: true,
          },
        },
      },
      result: { data: { updateAiPrompt: { id: 'p-1' } } },
    };
    const { onSaved } = await openAndEdit(row, [update]);

    setField('content', 'Write the Monday digest for {{club_name}}.');
    await settle();
    await submitForm();

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('creating sends the whole form, the key and the active switch included', async () => {
    const create: MockedResponse = {
      request: {
        query: CREATE_AI_PROMPT,
        variables: {
          input: {
            description: '',
            content: 'Summarise the pod feedback for DUN-POD-4821 in three lines.',
            target_model: '',
            name: 'Feedback summariser',
            category: 'General',
            is_active: false,
            key: 'feedback.summary',
          },
        },
      },
      result: { data: { createAiPrompt: { id: 'p-9' } } },
    };
    const { onSaved } = await openAndEdit(null, [create]);

    setField('name', 'Feedback summariser');
    setField('key', 'feedback.summary');
    setField('content', 'Summarise the pod feedback for DUN-POD-4821 in three lines.');
    fireEvent.click(document.body.querySelector('input[name="is_active"]') as HTMLElement);
    await settle();
    await submitForm();

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('a refused save shows the server error and reports nothing saved', async () => {
    const refused: MockedResponse = {
      request: {
        query: UPDATE_AI_PROMPT,
        variables: {
          id: 'p-1',
          input: {
            description: 'Answers where a page lives.',
            content: KEPT_BODY,
            target_model: 'claude-opus-5',
          },
        },
      },
      result: { errors: [new GraphQLError('A prompt with that key already exists')] },
    };
    const { onClose, onSaved } = await openAndEdit(prompt(), [refused]);

    setField('content', KEPT_BODY);
    await settle();
    await submitForm();

    expect(screen.getByText('A prompt with that key already exists')).toBeDefined();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('PromptForm on its own', () => {
  it('renders with only a submit handler: defaults, no cancel, and a live token estimate', async () => {
    render(<PromptForm onSubmit={vi.fn()} />);
    await settle();

    expect(screen.getByText('Save changes')).toBeDefined();
    expect(screen.queryByText('Cancel')).toBeNull();
    expect(screen.getByTestId('prompt-token-count').textContent).toContain('≈ 0 tokens');

    setField('content', 'Count the tokens of this body as it is typed.');
    await settle();
    expect(screen.getByTestId('prompt-token-count').textContent).not.toContain('≈ 0 tokens');
  });
});
