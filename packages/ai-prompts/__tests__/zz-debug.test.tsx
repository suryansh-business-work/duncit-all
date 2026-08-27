import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AI_PROMPTS, UPDATE_AI_PROMPT } from '../src/queries';
import { PromptLibraryView } from '../src/mui/PromptLibraryView';
import { API_ORIGIN, installGridViewport, prompt, renderInPortal, settle } from './support/harness';

vi.mock('@duncit/tabs', () => import('./support/tabs-stub'));
let restore: () => void;
beforeAll(() => { restore = installGridViewport(); });
afterAll(() => { restore(); });

describe('debug', () => {
  it('what has role alert after a save', async () => {
    const codeRow = prompt();
    const body = 'Use {{navigation_map}} to answer {{user_question}}. Be brief.';
    const mocks: MockedResponse[] = [
      { request: { query: AI_PROMPTS, variables: { filter: { kind: 'CODE' } } }, maxUsageCount: Number.POSITIVE_INFINITY, result: { data: { aiPrompts: [codeRow] } } },
      { request: { query: UPDATE_AI_PROMPT, variables: { id: 'p-1', input: { description: 'Answers where a page lives.', content: body, target_model: 'claude-opus-5' } } }, result: { data: { updateAiPrompt: { id: 'p-1' } } } },
    ];
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} />, mocks);
    await settle();
    await screen.findByText('Navigation Knowledge Bot');
    fireEvent.click(screen.getByLabelText('Edit Navigation Knowledge Bot'));
    await settle();
    fireEvent.change(document.body.querySelector('textarea[name="content"]') as HTMLElement, { target: { value: body } });
    await settle();
    fireEvent.submit(screen.getByTestId('prompt-form'));
    await settle();
    await waitFor(() => expect(screen.queryByText('Edit prompt')).toBeNull());
    for (const el of document.querySelectorAll('[role="alert"]')) {
      console.log('ALERT NODE:', el.className, '|', (el.textContent ?? '').slice(0, 120));
    }
    expect(true).toBe(true);
  });
});
