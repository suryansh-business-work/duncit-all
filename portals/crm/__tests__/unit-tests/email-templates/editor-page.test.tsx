import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { DELETE, SEND_TEST, UPDATE } from '@/api/emailTemplates.gql';
import { PREVIEW_WAIT, TEMPLATE_ID, renderEditor, renderMock, templateMock, venueTemplate } from './editorHarness';

// Monaco loads its editor from a CDN at runtime; a textarea stands in for it.
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: Readonly<{ value: string; onChange: (next: string | undefined) => void }>) => (
    <textarea aria-label="MJML editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const updateMock = (outcome: { error?: Error } = {}): MockedResponse => ({
  request: { query: UPDATE, variables: (vars: Record<string, unknown>) => vars.id === TEMPLATE_ID },
  ...(outcome.error ? { error: outcome.error } : { result: { data: { updateEmailTemplate: { template_id: TEMPLATE_ID } } } }),
});

describe('EmailTemplateEditorPage', () => {
  it('says so when the template does not exist, and goes back to the list', async () => {
    renderEditor([templateMock(null)]);

    expect(await screen.findByText('Template not found.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to templates' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/email-templates');
  });

  it('loads the template and renders its preview', async () => {
    renderEditor([templateMock(venueTemplate), renderMock({ html: '<p>Hi Grand Hall</p>' })]);

    expect(await screen.findByText('venue-welcome')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Venue welcome');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await waitFor(() => expect(screen.getByTitle('preview')).toHaveAttribute('srcdoc', '<p>Hi Grand Hall</p>'), PREVIEW_WAIT);
  });

  it('saves an edit and confirms it', async () => {
    const updateResult = vi.fn(() => ({ data: { updateEmailTemplate: { template_id: TEMPLATE_ID } } }));
    renderEditor([templateMock(venueTemplate), renderMock({}), { request: { query: UPDATE, variables: () => true }, result: updateResult }]);

    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Venue welcome v2' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Welcome, {{ venue_name }}' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Active' }));
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Template saved')).toBeInTheDocument();
    expect(updateResult).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ name: 'Venue welcome v2', subject: 'Welcome, {{ venue_name }}', is_active: false }),
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Template saved')).toBeNull());
  });

  it('reports a failed save', async () => {
    renderEditor([templateMock(venueTemplate), renderMock({}), updateMock({ error: new Error('Slug already taken') })]);

    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Venue welcome v2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Slug already taken')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Slug already taken')).toBeNull());
  });

  const verifyCases: Array<[string[], string]> = [
    [[], 'MJML looks good'],
    [['mj-text inside mj-body'], '1 MJML issue'],
    [['a', 'b'], '2 MJML issues'],
  ];

  it.each(verifyCases)('verifies the MJML (%j)', async (errors, message) => {
    renderEditor([templateMock(venueTemplate), renderMock({ errors })]);

    fireEvent.click(await screen.findByRole('button', { name: 'Verify MJML' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('counts a render that could not run as an MJML issue', async () => {
    renderEditor([templateMock(venueTemplate), renderMock(new Error('Renderer offline'))]);

    fireEvent.click(await screen.findByRole('button', { name: 'Verify MJML' }));

    expect(await screen.findByText('1 MJML issue')).toBeInTheDocument();
    expect(screen.getByText('Renderer offline')).toBeInTheDocument();
  });

  it('deletes the template after confirmation and returns to the list', async () => {
    const remove = vi.fn(() => ({ data: { deleteEmailTemplate: true } }));
    renderEditor([templateMock(venueTemplate), renderMock({}), { request: { query: DELETE, variables: { id: TEMPLATE_ID } }, result: remove }]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Delete "Venue welcome"? This cannot be undone.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByText('Delete "Venue welcome"? This cannot be undone.')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/email-templates$/));
    expect(remove).toHaveBeenCalled();
  });

  it('sends a test email with the default values and reports it', async () => {
    renderEditor([
      templateMock(venueTemplate),
      renderMock({}),
      {
        request: { query: SEND_TEST, variables: { id: TEMPLATE_ID, to: 'qa@duncit.com', vars: '{"venue_name":"Grand Hall"}' } },
        result: { data: { sendTestEmail: { ok: true, message: 'Sent to qa@duncit.com' } } },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Send test' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Send test email' }));
    fireEvent.change(dialog.getByLabelText(/^To/), { target: { value: ' qa@duncit.com ' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Sent to qa@duncit.com')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Send test email' })).toBeNull());
  });

  it('closes the test email dialog on Cancel', async () => {
    renderEditor([templateMock(venueTemplate), renderMock({})]);

    fireEvent.click(await screen.findByRole('button', { name: 'Send test' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Send test email' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Send test email' })).toBeNull());
  });
});
