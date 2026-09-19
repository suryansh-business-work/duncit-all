import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import CreateTemplateDialog from '@/pages/email-templates/CreateTemplateDialog';
import MjmlAiButton from '@/pages/email-templates/MjmlAiButton';
import SendTestDialog from '@/pages/email-templates/SendTestDialog';
import { AI_MJML, CREATE, SEND_TEST, STARTER_MJML } from '@/api/emailTemplates.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

describe('CreateTemplateDialog', () => {
  const renderDialog = (mocks: MockedResponse[] = []) => {
    const onClose = vi.fn();
    const onCreated = vi.fn();
    renderWithApollo(<CreateTemplateDialog open onClose={onClose} onCreated={onCreated} />, mocks);
    return { onClose, onCreated };
  };

  const createMock = (input: Record<string, unknown>, outcome: { error?: Error } = {}): MockedResponse => ({
    request: { query: CREATE, variables: { input } },
    ...(outcome.error ? { error: outcome.error } : { result: { data: { createEmailTemplate: { template_id: 'tpl-new' } } } }),
  });

  it('starts with the audience cards and lets the choice be changed', () => {
    renderDialog();

    expect(screen.getByText('Who is this template for?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();

    fireEvent.click(screen.getByText('Host lead emails'));
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('Host lead emails')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByText('Ecomm lead emails')).toBeInTheDocument();
  });

  it('creates a template with a slug derived from its name', async () => {
    const { onCreated } = renderDialog([
      createMock({ slug: 'diwali-offer-2026', name: 'Diwali Offer 2026', subject: 'Festive rates inside', target: 'VENUE', mjml: STARTER_MJML }),
    ]);

    fireEvent.click(screen.getByText('Venue lead emails'));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: '  Diwali Offer 2026 ' } });
    expect(screen.getByLabelText('Slug')).toHaveAttribute('placeholder', 'diwali-offer-2026');
    fireEvent.change(screen.getByLabelText(/^Subject/), { target: { value: 'Festive rates inside' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('tpl-new'));
  });

  it('uses a typed slug, and reports a failed create', async () => {
    renderDialog([
      createMock(
        { slug: 'static-footer', name: 'Footer', subject: 'Footer', target: 'STATIC', mjml: STARTER_MJML },
        { error: new Error('Slug already exists') },
      ),
    ]);

    fireEvent.click(screen.getByText('Static / no variables'));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Footer' } });
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'static-footer' } });
    fireEvent.change(screen.getByLabelText(/^Subject/), { target: { value: 'Footer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Slug already exists')).toBeInTheDocument();
  });

  it('asks for a usable name when it yields no slug', () => {
    renderDialog();

    fireEvent.click(screen.getByText('Ecomm lead emails'));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: '***' } });
    expect(screen.getByLabelText('Slug')).toHaveAttribute('placeholder', 'welcome-email');
    fireEvent.change(screen.getByLabelText(/^Subject/), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByText('Pick a type and fill name + subject.')).toBeInTheDocument();
  });

  it('forgets the draft when cancelled', () => {
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByText('Venue lead emails'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(screen.getByText('Who is this template for?')).toBeInTheDocument();
  });
});

describe('MjmlAiButton', () => {
  const aiMock = (outcome: { mjml?: string; error?: Error }): MockedResponse => ({
    request: { query: AI_MJML, variables: { input: { prompt: 'Rooftop launch', current_mjml: '<mjml/>' } } },
    ...(outcome.error ? { error: outcome.error } : { result: { data: { aiCreateOrUpdateMjml: outcome.mjml } } }),
  });

  const openPrompt = async (label = 'Create with AI') => {
    fireEvent.click(screen.getByRole('button', { name: label }));
    const popover = within(await screen.findByRole('dialog', { name: 'Create / update MJML with AI' }));
    fireEvent.change(popover.getByLabelText('Prompt'), { target: { value: 'Rooftop launch' } });
    return popover;
  };

  it('uses its default label and explains an empty AI answer', async () => {
    const onApply = vi.fn();
    renderWithApollo(<MjmlAiButton currentMjml="<mjml/>" onApply={onApply} />, [aiMock({ mjml: '' })]);

    const popover = await openPrompt();
    fireEvent.click(popover.getByRole('button', { name: 'Apply' }));

    expect(await popover.findByText('AI did not return MJML')).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('shows a failed generation and can be cancelled or dismissed', async () => {
    renderWithApollo(<MjmlAiButton currentMjml="<mjml/>" onApply={vi.fn()} label="Seed MJML with AI" />, [
      aiMock({ error: new Error('AI quota exhausted') }),
    ]);

    const popover = await openPrompt('Seed MJML with AI');
    fireEvent.click(popover.getByRole('button', { name: 'Apply' }));
    expect(await popover.findByText('AI quota exhausted')).toBeInTheDocument();

    fireEvent.click(popover.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Seed MJML with AI' }));
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('cannot be dismissed while generating', async () => {
    renderWithApollo(<MjmlAiButton currentMjml="<mjml/>" onApply={vi.fn()} />, [
      { ...aiMock({ mjml: '<mjml/>' }), delay: Infinity },
    ]);

    const popover = await openPrompt();
    fireEvent.click(popover.getByRole('button', { name: 'Apply' }));
    expect(await popover.findByRole('button', { name: 'Working…' })).toBeDisabled();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('SendTestDialog', () => {
  const sendMock = (outcome: { result?: Record<string, unknown>; error?: Error }): MockedResponse => ({
    request: { query: SEND_TEST, variables: { id: 'tpl-venue', to: 'qa@duncit.com', vars: '{}' } },
    ...(outcome.error ? { error: outcome.error } : { result: { data: { sendTestEmail: outcome.result } } }),
  });

  const renderDialog = (mocks: MockedResponse[], templateId: string | null = 'tpl-venue') => {
    const onClose = vi.fn();
    const onResult = vi.fn();
    renderWithApollo(<SendTestDialog open templateId={templateId} varsJson="{}" onClose={onClose} onResult={onResult} />, mocks);
    return { onClose, onResult };
  };

  const send = () => {
    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: 'qa@duncit.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  };

  it('asks for a saved template first', () => {
    renderDialog([], null);
    expect(screen.getByText('Save the template first.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('validates the address as it is typed', () => {
    renderDialog([]);
    expect(screen.getByText('Uses the sample JSON from the Variables tab.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: 'qa@duncit' } });
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('reports a delivered test and closes, with a default message when none is given', async () => {
    const { onClose, onResult } = renderDialog([sendMock({ result: { ok: true, message: null } })]);

    send();

    await waitFor(() => expect(onResult).toHaveBeenCalledWith('success', 'Sent'));
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the dialog open on a refused send', async () => {
    const { onClose, onResult } = renderDialog([sendMock({ result: { ok: false, message: 'SMTP rejected the sender' } })]);

    send();

    expect(await screen.findByRole('alert')).toHaveTextContent('SMTP rejected the sender');
    expect(onResult).toHaveBeenCalledWith('error', 'SMTP rejected the sender');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('says Failed when a refused send gives no reason', async () => {
    const { onResult } = renderDialog([sendMock({ result: { ok: false, message: null } })]);
    send();
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('error', 'Failed'));
  });

  it('reports a send that could not be attempted', async () => {
    const { onResult } = renderDialog([sendMock({ error: new Error('Mail service down') })]);

    send();

    expect(await screen.findByRole('alert')).toHaveTextContent('Mail service down');
    expect(onResult).toHaveBeenCalledWith('error', 'Mail service down');
  });

  it('locks while sending', async () => {
    const { onClose } = renderDialog([{ ...sendMock({ result: { ok: true, message: 'Sent' } }), delay: Infinity }]);

    send();

    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
