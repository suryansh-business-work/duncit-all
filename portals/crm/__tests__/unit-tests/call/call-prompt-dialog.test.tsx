import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import CallPromptDialog from '@/pages/call-prompts/CallPromptDialog';
import {
  CREATE_CRM_CALL_PROMPT,
  UPDATE_CRM_CALL_PROMPT,
  type CrmCallPrompt,
} from '@/api/call.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

const prompt: CrmCallPrompt = {
  id: 'p1',
  name: 'Venue intro',
  description: 'Opens the call with the venue pitch',
  context: 'Ask the owner about capacity and weekend slots.',
  language: 'hi-IN',
  is_active: false,
  created_by: 'u1',
  created_at: '2026-02-01T10:00:00.000Z',
  updated_at: '2026-02-02T10:00:00.000Z',
};

const createInput = {
  name: 'Host pitch',
  description: '',
  context: 'You are a Duncit agent. Pitch hosting a pod politely.',
  language: 'auto',
  is_active: true,
};

const updateInput = {
  name: 'Venue intro',
  description: 'Opens the call with the venue pitch',
  context: 'Ask the owner about capacity and weekend slots.',
  language: 'hi-IN',
  is_active: false,
};

const createMock = (result: object) => ({
  request: { query: CREATE_CRM_CALL_PROMPT, variables: { input: createInput } },
  ...result,
});

const updateMock = {
  request: { query: UPDATE_CRM_CALL_PROMPT, variables: { id: 'p1', input: updateInput } },
  result: { data: { updateCrmCallPrompt: prompt } },
};

function mount(editing: CrmCallPrompt | null, mocks: ReadonlyArray<any>) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  renderWithApollo(<CallPromptDialog open prompt={editing} onClose={onClose} onSaved={onSaved} />, mocks);
  return { onClose, onSaved };
}

function fillCreateForm() {
  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: createInput.name } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Static content' }), { target: { value: createInput.context } });
}

describe('CallPromptDialog', () => {
  it('creates a new prompt with the form values, then reports the save and closes', async () => {
    const { onClose, onSaved } = mount(null, [
      createMock({ result: { data: { createCrmCallPrompt: { ...prompt, id: 'p2', ...createInput } } } }),
    ]);

    expect(screen.getByRole('heading', { name: 'Add Static Content' })).toBeInTheDocument();
    fillCreateForm();
    const add = screen.getByRole('button', { name: 'Add' });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('updates the edited prompt by id with its prefilled values', async () => {
    const { onClose, onSaved } = mount(prompt, [updateMock]);

    expect(screen.getByRole('heading', { name: 'Edit Static Content' })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toHaveValue('Venue intro');
    const save = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the server error, keeps the dialog open, and clears it on a successful retry', async () => {
    const { onClose, onSaved } = mount(null, [
      createMock({ result: { errors: [new GraphQLError('A prompt with this name already exists')] } }),
      createMock({ result: { data: { createCrmCallPrompt: { ...prompt, id: 'p2', ...createInput } } } }),
    ]);

    fillCreateForm();
    const add = screen.getByRole('button', { name: 'Add' });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);

    expect(await screen.findByText('A prompt with this name already exists')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('A prompt with this name already exists')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the Cancel button without saving', () => {
    const { onClose, onSaved } = mount(null, []);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
  });
});
