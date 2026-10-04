import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import CallPromptsPage from '@/pages/call-prompts';
import {
  CRM_CALL_PROMPTS_TABLE,
  DELETE_CRM_CALL_PROMPT,
  UPDATE_CRM_CALL_PROMPT,
  type CrmCallPrompt,
} from '@/api/call.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

const prompt: CrmCallPrompt = {
  id: 'p1',
  name: 'Venue intro',
  description: 'Opens the call with the venue pitch',
  context: 'Ask the owner about capacity and weekend slots.',
  language: 'auto',
  is_active: true,
  created_by: 'u1',
  created_at: '2026-02-01T10:00:00.000Z',
  updated_at: '2026-02-02T10:00:00.000Z',
};

// tableQueryToGql() of DuncitTable's initial state (no default sort).
const tableVars = {
  query: { search: null, page: 1, page_size: 25, sort_by: null, sort_dir: 'asc', filters: [] },
};

const tableMock = (rows: CrmCallPrompt[]) => ({
  request: { query: CRM_CALL_PROMPTS_TABLE, variables: tableVars },
  result: { data: { crmCallPromptsTable: { __typename: 'CrmCallPromptTable', total: rows.length, rows: rows.map((r) => ({ __typename: 'CrmCallPrompt', ...r })) } } },
});

beforeEach(() => {
  window.localStorage.clear();
});

describe('CallPromptsPage', () => {
  it('opens the create dialog from the toolbar action', async () => {
    renderWithApollo(<CallPromptsPage />, [tableMock([prompt])]);
    await screen.findByText('Venue intro');

    fireEvent.click(screen.getByRole('button', { name: 'Add Static Content' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Add Static Content' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/name/i)).toHaveValue('');
  });

  it('edits a row and reloads the table once the change is saved', async () => {
    const renamed = { ...prompt, name: 'Venue intro v2' };
    renderWithApollo(<CallPromptsPage />, [
      tableMock([prompt]),
      {
        request: {
          query: UPDATE_CRM_CALL_PROMPT,
          variables: {
            id: 'p1',
            input: {
              name: 'Venue intro v2',
              description: prompt.description,
              context: prompt.context,
              language: 'auto',
              is_active: true,
            },
          },
        },
        result: { data: { updateCrmCallPrompt: renamed } },
      },
      tableMock([renamed]),
    ]);
    await screen.findByText('Venue intro');

    fireEvent.click(screen.getByLabelText('Edit Venue intro'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Edit Static Content' })).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/name/i), { target: { value: 'Venue intro v2' } });
    const save = within(dialog).getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    expect(await screen.findByText('Venue intro v2')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('deletes the confirmed prompt and reloads the table', async () => {
    renderWithApollo(<CallPromptsPage />, [
      tableMock([prompt]),
      {
        request: { query: DELETE_CRM_CALL_PROMPT, variables: { id: 'p1' } },
        result: { data: { deleteCrmCallPrompt: true } },
      },
      tableMock([]),
    ]);
    await screen.findByText('Venue intro');

    fireEvent.click(screen.getByLabelText('Delete Venue intro'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete "Venue intro"? This cannot be undone.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(/No Static Content yet/i)).toBeInTheDocument();
    expect(screen.queryByText('Venue intro')).toBeNull();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the prompt when the delete is cancelled', async () => {
    renderWithApollo(<CallPromptsPage />, [tableMock([prompt])]);
    await screen.findByText('Venue intro');

    fireEvent.click(screen.getByLabelText('Delete Venue intro'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Venue intro')).toBeInTheDocument();
  });
});
