import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AI_PROMPTS, UPDATE_AI_PROMPT } from '../src/queries';
import { PromptLibraryView } from '../src/mui/PromptLibraryView';
import { API_ORIGIN, installGridViewport, prompt, renderInPortal, settle } from './support/harness';

vi.mock('@duncit/tabs', () => import('./support/tabs-stub'));
let restore: () => void;
beforeAll(() => {
  restore = installGridViewport();
});
afterAll(() => {
  restore();
});

/**
 * The round trip the dialog's own tests cannot see: editing a CODE prompt from
 * the LIBRARY, not from a directly-mounted <PromptDialog/>. The library owns
 * opening the editor on the right row and closing it once the save lands.
 */
describe('PromptLibraryView save', () => {
  it('opens the editor on the row pressed, saves it, and closes the dialog', async () => {
    const codeRow = prompt();
    const body = 'Use {{navigation_map}} to answer {{user_question}}. Be brief.';
    const mocks: MockedResponse[] = [
      {
        request: { query: AI_PROMPTS, variables: { filter: { kind: 'CODE' } } },
        maxUsageCount: Number.POSITIVE_INFINITY,
        result: { data: { aiPrompts: [codeRow] } },
      },
      {
        request: {
          query: UPDATE_AI_PROMPT,
          variables: {
            id: 'p-1',
            input: {
              description: 'Answers where a page lives.',
              content: body,
              target_model: 'claude-opus-5',
            },
          },
        },
        result: { data: { updateAiPrompt: { id: 'p-1' } } },
      },
    ];
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} />, mocks);
    await settle();
    await screen.findByText('Navigation Knowledge Bot');

    fireEvent.click(screen.getByLabelText('Edit Navigation Knowledge Bot'));
    await settle();
    // The editor opened on THIS row, carrying its body rather than a blank one.
    const content = document.body.querySelector('textarea[name="content"]');
    expect(content).not.toBeNull();
    expect((content as HTMLTextAreaElement).value).toBe(codeRow.content);

    fireEvent.change(content as HTMLElement, { target: { value: body } });
    await settle();
    fireEvent.submit(screen.getByTestId('prompt-form'));
    await settle();

    // A save that lands closes the editor — and leaves the library standing,
    // still listing the row it just wrote.
    await waitFor(() => expect(screen.queryByText('Edit prompt')).toBeNull());
    expect(screen.getByText('Navigation Knowledge Bot')).toBeDefined();
  });
});
