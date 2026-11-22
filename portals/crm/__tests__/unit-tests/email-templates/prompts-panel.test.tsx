import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import PromptsPanel from '@/pages/email-templates/settings/PromptsPanel';
import { RESET_CRM_EMAIL_AI_PROMPT, UPDATE_CRM_EMAIL_AI_PROMPT, type CrmEmailAiPrompt } from '@/api/emailSettings.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { SYSTEM_PROMPT, USER_PROMPT, mutationMock, promptsMock } from './settingsFixtures';

const { notifySuccess } = vi.hoisted(() => ({ notifySuccess: vi.fn() }));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess,
}));

const saveMock = (outcome: CrmEmailAiPrompt | Error) => mutationMock(UPDATE_CRM_EMAIL_AI_PROMPT, 'updateCrmEmailAiPrompt', outcome);
const resetMock = (outcome: CrmEmailAiPrompt | Error) => mutationMock(RESET_CRM_EMAIL_AI_PROMPT, 'resetCrmEmailAiPrompt', outcome);

const formOf = (prompt: CrmEmailAiPrompt) => within(screen.getByTestId(`email-prompt-form-${prompt.key}`));
const inputOf = (prompt: CrmEmailAiPrompt) => screen.getByTestId(`email-prompt-input-${prompt.key}`);

const renderPanel = (mocks: MockedResponse[]) => renderWithApollo(<PromptsPanel />, mocks);

beforeEach(() => {
  notifySuccess.mockClear();
});

describe('PromptsPanel — loading', () => {
  it('shows a spinner, then both CRM prompts under the note that they are the CRM’s own', async () => {
    renderPanel([promptsMock([SYSTEM_PROMPT, USER_PROMPT])]);

    expect(screen.getByRole('progressbar', { name: 'Loading prompts' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Instructions for the AI' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Request format' })).toBeInTheDocument();
    expect(screen.getByText(/These instructions run behind "Seed MJML with AI"/)).toBeInTheDocument();
    expect(inputOf(SYSTEM_PROMPT)).toHaveValue(SYSTEM_PROMPT.content);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('warns when the server has no CRM prompts yet', async () => {
    renderPanel([promptsMock([])]);

    expect(await screen.findByText('The CRM email prompts are not set up on this server yet. Try again in a minute.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save prompt' })).toBeNull();
  });

  it('reports a failed load and loads again on retry', async () => {
    renderPanel([promptsMock(new Error('Prompt library offline'), 1), promptsMock([SYSTEM_PROMPT])]);

    expect(await screen.findByText('Prompt library offline')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Instructions for the AI' })).toBeInTheDocument();
    expect(screen.queryByText('Prompt library offline')).toBeNull();
  });
});

describe('PromptsPanel — saving', () => {
  it('saves an edited prompt under its key and shows what the server kept', async () => {
    const edited = 'Write MJML. Always follow {{brand_rules}}.';
    const save = saveMock({ ...SYSTEM_PROMPT, content: edited });
    renderPanel([promptsMock([SYSTEM_PROMPT, USER_PROMPT], 1), save.mock, promptsMock([{ ...SYSTEM_PROMPT, content: edited }, USER_PROMPT])]);

    await screen.findByRole('heading', { name: 'Instructions for the AI' });
    fireEvent.change(inputOf(SYSTEM_PROMPT), { target: { value: edited } });
    const saveButton = formOf(SYSTEM_PROMPT).getByRole('button', { name: 'Save prompt' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() => expect(save.answer).toHaveBeenCalledWith({ key: SYSTEM_PROMPT.key, content: edited }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Prompt saved'));
    await waitFor(() => expect(formOf(SYSTEM_PROMPT).getByRole('button', { name: 'Save prompt' })).toBeDisabled());
    expect(inputOf(SYSTEM_PROMPT)).toHaveValue(edited);
    // The other prompt was never touched.
    expect(formOf(USER_PROMPT).getByRole('button', { name: 'Save prompt' })).toBeDisabled();
  });

  it('shows why the server refused a save, keeps the edit, and lets the message be dismissed', async () => {
    const save = saveMock(new Error('The prompt must keep {{instruction}}'));
    renderPanel([promptsMock([SYSTEM_PROMPT, USER_PROMPT]), save.mock]);

    await screen.findByRole('heading', { name: 'Request format' });
    fireEvent.change(inputOf(USER_PROMPT), { target: { value: 'Request: {{instruction}} only' } });
    const saveButton = formOf(USER_PROMPT).getByRole('button', { name: 'Save prompt' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    const message = await screen.findByText('The prompt must keep {{instruction}}');
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(inputOf(USER_PROMPT)).toHaveValue('Request: {{instruction}} only');

    fireEvent.click(within(message.closest('.MuiAlert-root') as HTMLElement).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('The prompt must keep {{instruction}}')).toBeNull());
  });
});

describe('PromptsPanel — reset', () => {
  it('asks before putting the shipped default back, and does nothing when cancelled', async () => {
    const reset = resetMock(USER_PROMPT);
    renderPanel([promptsMock([SYSTEM_PROMPT, USER_PROMPT]), reset.mock]);

    await screen.findByRole('heading', { name: 'Request format' });
    fireEvent.click(formOf(USER_PROMPT).getByRole('button', { name: 'Reset to default' }));

    expect(await screen.findByText('Reset this prompt?')).toBeInTheDocument();
    expect(screen.getByText('Your edits to this prompt are replaced with the shipped default.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(reset.answer).not.toHaveBeenCalled();
  });

  it('resets the confirmed prompt and shows the default the server sends back', async () => {
    const shipped = 'Shipped: {{instruction}}';
    const reset = resetMock({ ...USER_PROMPT, content: shipped });
    renderPanel([promptsMock([SYSTEM_PROMPT, USER_PROMPT], 1), reset.mock, promptsMock([SYSTEM_PROMPT, { ...USER_PROMPT, content: shipped }])]);

    await screen.findByRole('heading', { name: 'Request format' });
    fireEvent.click(formOf(USER_PROMPT).getByRole('button', { name: 'Reset to default' }));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(reset.answer).toHaveBeenCalledWith({ key: USER_PROMPT.key }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Prompt reset to default'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    await waitFor(() => expect(inputOf(USER_PROMPT)).toHaveValue(shipped));
  });

  it('closes the confirmation and reports a reset the server refused', async () => {
    const reset = resetMock(new Error('Default prompt missing'));
    renderPanel([promptsMock([SYSTEM_PROMPT, USER_PROMPT]), reset.mock]);

    await screen.findByRole('heading', { name: 'Instructions for the AI' });
    fireEvent.click(formOf(SYSTEM_PROMPT).getByRole('button', { name: 'Reset to default' }));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    expect(await screen.findByText('Default prompt missing')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
