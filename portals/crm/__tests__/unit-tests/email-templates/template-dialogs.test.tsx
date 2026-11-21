import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import CreateTemplateDialog from '@/pages/email-templates/CreateTemplateDialog';
import MjmlAiButton from '@/pages/email-templates/MjmlAiButton';
import SendTestDialog from '@/pages/email-templates/SendTestDialog';
import { CREATE, SEND_TEST } from '@/api/emailTemplates.gql';
import { CRM_EMAIL_STARTER, GENERATE_CRM_EMAIL_MJML } from '@/api/emailSettings.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

// The shared Duncit starter card, as the server hands it out.
const STARTER_MJML = '<mjml><mj-body><mj-section><mj-column><mj-text>Duncit starter</mj-text></mj-column></mj-section></mj-body></mjml>';

const starterMock = (outcome: { mjml?: string; error?: Error } = { mjml: STARTER_MJML }): MockedResponse => ({
  request: { query: CRM_EMAIL_STARTER },
  ...(outcome.error ? { error: outcome.error } : { result: { data: { crmEmailStarterMjml: outcome.mjml } } }),
  maxUsageCount: 5,
});

const generateMock = (
  input: { prompt: string; current_mjml: string; target: string | null },
  outcome: { mjml?: string; error?: Error },
): MockedResponse => ({
  request: { query: GENERATE_CRM_EMAIL_MJML, variables: { input } },
  ...(outcome.error ? { error: outcome.error } : { result: { data: { generateCrmEmailMjml: outcome.mjml } } }),
});

const createButton = () => screen.getByRole('button', { name: 'Create' });

/** Lets a mocked answer (or failure) that is already on its way land. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

describe('CreateTemplateDialog', () => {
  const renderDialog = (mocks: MockedResponse[] = [starterMock()]) => {
    const onClose = vi.fn();
    const onCreated = vi.fn();
    renderWithApollo(<CreateTemplateDialog open onClose={onClose} onCreated={onCreated} />, mocks);
    return { onClose, onCreated };
  };

  const createMock = (input: Record<string, unknown>, outcome: { error?: Error } = {}): MockedResponse => ({
    request: { query: CREATE, variables: { input } },
    ...(outcome.error ? { error: outcome.error } : { result: { data: { createEmailTemplate: { template_id: 'tpl-new' } } } }),
  });

  const fillBasics = (name: string, subject: string) => {
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: name } });
    fireEvent.change(screen.getByLabelText(/^Subject/), { target: { value: subject } });
  };

  const seedWithAi = async (prompt: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Seed MJML with AI' }));
    const popover = within(await screen.findByRole('dialog', { name: 'Create / update MJML with AI' }));
    fireEvent.change(popover.getByLabelText('Prompt'), { target: { value: prompt } });
    fireEvent.click(popover.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Create / update MJML with AI' })).toBeNull());
  };

  it('starts with the audience cards and lets the choice be changed', () => {
    renderDialog();

    expect(screen.getByText('Who is this template for?')).toBeInTheDocument();
    expect(createButton()).toBeDisabled();

    fireEvent.click(screen.getByText('Host lead emails'));
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('Host lead emails')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByText('Ecomm lead emails')).toBeInTheDocument();
  });

  it('creates a template on the shared starter with a slug derived from its name', async () => {
    const { onCreated } = renderDialog([
      starterMock(),
      createMock({ slug: 'diwali-offer-2026', name: 'Diwali Offer 2026', subject: 'Festive rates inside', target: 'VENUE', mjml: STARTER_MJML }),
    ]);

    fireEvent.click(screen.getByText('Venue lead emails'));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: '  Diwali Offer 2026 ' } });
    expect(screen.getByLabelText('Slug')).toHaveAttribute('placeholder', 'diwali-offer-2026');
    fireEvent.change(screen.getByLabelText(/^Subject/), { target: { value: 'Festive rates inside' } });
    await waitFor(() => expect(createButton()).toBeEnabled());
    fireEvent.click(createButton());

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('tpl-new'));
  });

  it('uses a typed slug, and reports a failed create', async () => {
    renderDialog([
      starterMock(),
      createMock(
        { slug: 'static-footer', name: 'Footer', subject: 'Footer', target: 'STATIC', mjml: STARTER_MJML },
        { error: new Error('Slug already exists') },
      ),
    ]);

    fireEvent.click(screen.getByText('Static / no variables'));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Footer' } });
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'static-footer' } });
    fireEvent.change(screen.getByLabelText(/^Subject/), { target: { value: 'Footer' } });
    await waitFor(() => expect(createButton()).toBeEnabled());
    fireEvent.click(createButton());

    expect(await screen.findByText('Slug already exists')).toBeInTheDocument();
  });

  it('asks for a usable name when it yields no slug', async () => {
    renderDialog();

    fireEvent.click(screen.getByText('Ecomm lead emails'));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: '***' } });
    expect(screen.getByLabelText('Slug')).toHaveAttribute('placeholder', 'welcome-email');
    fireEvent.change(screen.getByLabelText(/^Subject/), { target: { value: 'Hello' } });
    await waitFor(() => expect(createButton()).toBeEnabled());
    fireEvent.click(createButton());

    expect(screen.getByText('Pick a type and fill name + subject.')).toBeInTheDocument();
  });

  it('forgets the draft when cancelled', () => {
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByText('Venue lead emails'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(screen.getByText('Who is this template for?')).toBeInTheDocument();
  });

  it('does not fetch the starter while closed', async () => {
    const starter = vi.fn(() => ({ data: { crmEmailStarterMjml: STARTER_MJML } }));
    renderWithApollo(<CreateTemplateDialog open={false} onClose={vi.fn()} onCreated={vi.fn()} />, [
      { request: { query: CRM_EMAIL_STARTER }, result: starter },
    ]);

    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(starter).not.toHaveBeenCalled();
  });

  it('keeps Create off with no MJML, and lets the AI seed one for the chosen audience', async () => {
    const seeded = '<mjml><mj-body><mj-text>Host welcome</mj-text></mj-body></mjml>';
    const { onCreated } = renderDialog([
      starterMock({ error: new Error('Starter unavailable') }),
      generateMock({ prompt: 'A host welcome', current_mjml: '', target: 'HOST' }, { mjml: seeded }),
      createMock({ slug: 'host-welcome', name: 'Host welcome', subject: 'Welcome', target: 'HOST', mjml: seeded }),
    ]);

    fireEvent.click(screen.getByText('Host lead emails'));
    fillBasics('Host welcome', 'Welcome');
    // Name and subject are in, but the starter never arrived, so there is nothing to save yet.
    await settle();
    expect(createButton()).toBeDisabled();

    await seedWithAi('A host welcome');

    await waitFor(() => expect(createButton()).toBeEnabled());
    fireEvent.click(createButton());
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('tpl-new'));
  });

  it('hands the starter to the AI as the MJML to rework, and creates with the result', async () => {
    const reworked = '<mjml><mj-body><mj-text>Venue offer</mj-text></mj-body></mjml>';
    const { onCreated } = renderDialog([
      starterMock(),
      generateMock({ prompt: 'Make it a venue offer', current_mjml: STARTER_MJML, target: 'VENUE' }, { mjml: reworked }),
      createMock({ slug: 'venue-offer', name: 'Venue offer', subject: 'Rates', target: 'VENUE', mjml: reworked }),
    ]);

    fireEvent.click(screen.getByText('Venue lead emails'));
    fillBasics('Venue offer', 'Rates');
    await waitFor(() => expect(createButton()).toBeEnabled());

    await seedWithAi('Make it a venue offer');

    fireEvent.click(createButton());
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('tpl-new'));
  });
});

describe('MjmlAiButton', () => {
  const aiMock = (outcome: { mjml?: string; error?: Error }, target: string | null = null): MockedResponse =>
    generateMock({ prompt: 'Rooftop launch', current_mjml: '<mjml/>', target }, outcome);

  const openPrompt = async (label = 'Create with AI', prompt = 'Rooftop launch') => {
    fireEvent.click(screen.getByRole('button', { name: label }));
    const popover = within(await screen.findByRole('dialog', { name: 'Create / update MJML with AI' }));
    fireEvent.change(popover.getByLabelText('Prompt'), { target: { value: prompt } });
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

  it('sends the trimmed prompt with the template audience, applies the answer and starts the next prompt empty', async () => {
    const onApply = vi.fn();
    renderWithApollo(<MjmlAiButton currentMjml="<mjml/>" onApply={onApply} target="ECOMM" />, [
      aiMock({ mjml: '<mjml><mj-body/></mjml>' }, 'ECOMM'),
    ]);

    const popover = await openPrompt('Create with AI', '  Rooftop launch  ');
    fireEvent.click(popover.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith('<mjml><mj-body/></mjml>'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Create with AI' }));
    const reopened = within(await screen.findByRole('dialog'));
    expect(reopened.getByLabelText('Prompt')).toHaveValue('');
    expect(reopened.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('will not send a blank instruction', async () => {
    renderWithApollo(<MjmlAiButton currentMjml="<mjml/>" onApply={vi.fn()} />, []);

    const popover = await openPrompt('Create with AI', '   ');
    expect(popover.getByRole('button', { name: 'Apply' })).toBeDisabled();
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
