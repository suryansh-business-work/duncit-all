import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { notifySuccess } from '@duncit/dialogs';
import NodeInspector from '../../src/pages/automation/builder/inspector/NodeInspector';
import ExitConnections from '../../src/pages/automation/builder/inspector/ExitConnections';
import { triggerSchema, type TriggerValues } from '../../src/pages/automation/builder/inspector/schemas';
import { useNodeForm } from '../../src/pages/automation/builder/inspector/useNodeForm';
import type { CanvasNode } from '../../src/pages/automation/graph-io';
import type { AutomationChannel, AutomationOptions } from '../../src/pages/automation/types';
import { renderWithProviders } from '../testkit';
import { OPTIONS, en, label, node } from './automation-fixtures';

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
}));

interface HarnessProps {
  initial: CanvasNode[];
  channel?: AutomationChannel;
  options?: AutomationOptions;
  onChangeSpy?: (id: string, config: Record<string, unknown>) => void;
  onRemove?: (id: string) => void;
  onConnect?: (source: string, handle: string, target: string) => void;
  onDisconnect?: (source: string, handle: string) => void;
  selectedId?: string | null;
  edgeHandle?: string;
}

/** Holds the canvas like the builder does, so an edit in the inspector flows back into it. */
function Harness({ initial, channel = 'WHATSAPP', options = OPTIONS, selectedId, ...spies }: Readonly<HarnessProps>) {
  const [nodes, setNodes] = useState(initial);
  const target = selectedId === undefined ? initial[0].id : selectedId;
  const selected = nodes.find((candidate) => candidate.id === target) ?? null;
  return (
    <NodeInspector
      node={selected}
      nodes={nodes}
      edges={[{ id: 'e1', source: initial[0].id, sourceHandle: spies.edgeHandle ?? 'next', target: 'b' }]}
      channel={channel}
      options={options}
      onChange={(id, config) => {
        spies.onChangeSpy?.(id, config);
        setNodes((current) => current.map((row) => (row.id === id ? { ...row, data: { ...row.data, config } } : row)));
      }}
      onRemove={spies.onRemove ?? vi.fn()}
      onConnect={spies.onConnect ?? vi.fn()}
      onDisconnect={spies.onDisconnect ?? vi.fn()}
    />
  );
}

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const lastConfig = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.at(-1)?.[1] as Record<string, unknown>;

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
});

describe('NodeInspector — shell', () => {
  it('asks for a step when none is selected', () => {
    renderWithProviders(<Harness initial={[node('a', 'delay')]} selectedId={null} />);
    expect(screen.getByText(en('ai.automation.builder.inspectorEmpty'))).toBeInTheDocument();
    expect(screen.queryByTestId('automation-inspector')).not.toBeInTheDocument();
  });

  it('locks the trigger against deletion and lists what the server said is wrong', () => {
    const onRemove = vi.fn();
    renderWithProviders(
      <Harness initial={[node('t', 'trigger', { trigger: 'MANUAL' }, ['Pick a trigger'])]} onRemove={onRemove} />
    );
    expect(screen.getByText('Pick a trigger')).toBeInTheDocument();
    expect(screen.getByTestId('automation-inspector-delete')).toBeDisabled();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('deletes a non-trigger step', () => {
    const onRemove = vi.fn();
    renderWithProviders(<Harness initial={[node('d', 'delay', { amount: 1, unit: 'HOURS' })]} onRemove={onRemove} />);
    fireEvent.click(screen.getByTestId('automation-inspector-delete'));
    expect(onRemove).toHaveBeenCalledWith('d');
  });
});

describe('NodeInspector — exits and variables', () => {
  it('wires and clears an exit from its select', async () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    renderWithProviders(
      <Harness
        initial={[node('c', 'condition', { variable: 'message.text', operator: 'contains', value: 'x' }), node('b', 'delay', { amount: 1, unit: 'DAYS' })]}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        edgeHandle="yes"
      />
    );
    // Two exits for a condition, and only the other step is offered as a target.
    // "Yes" already leads to the other step; "No" leads nowhere yet.
    const yes = within(screen.getByTestId('automation-exit-yes'));
    expect(yes.getByRole('combobox')).toHaveTextContent(en('ai.automation.kinds.delay'));
    fireEvent.mouseDown(yes.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: en('ai.automation.builder.notConnected') }));
    expect(onDisconnect).toHaveBeenCalledWith('c', 'yes');

    fireEvent.mouseDown(within(screen.getByTestId('automation-exit-no')).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: new RegExp(en('ai.automation.kinds.delay')) }));
    expect(onConnect).toHaveBeenCalledWith('c', 'no', 'b');
  });

  it('copies a variable token, and offers the channel, stored and profile variables once each', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderWithProviders(
      <Harness
        channel="EMAIL"
        initial={[
          node('d', 'delay'),
          node('a', 'ai_compose', { output_var: 'reply' }),
          node('h', 'http_request', { output_var: 'reply' }),
          node('s', 'set_variable', { name: 'plan' }),
          node('k', 'ai_classify', { labels: ['a', 'b'] }),
        ]}
      />
    );
    expect(screen.getByText('{{message.subject}}')).toBeInTheDocument();
    expect(screen.getByText('{{contact.email}}')).toBeInTheDocument();
    expect(screen.queryByText('{{contact.phone}}')).not.toBeInTheDocument();
    expect(screen.getAllByText('{{reply}}')).toHaveLength(1);
    expect(screen.getByText('{{plan}}')).toBeInTheDocument();
    expect(screen.getByText('{{intent}}')).toBeInTheDocument();
    expect(screen.getByText('{{user.city}}')).toBeInTheDocument();

    fireEvent.click(screen.getByText('{{plan}}'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('{{plan}}'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(en('ai.automation.builder.copied', { name: '{{plan}}' })));
  });
});

describe('NodeInspector — step settings write through', () => {
  it('trigger: switches to manual and hides keywords; copies the webhook', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const spy = vi.fn();
    renderWithProviders(
      <Harness initial={[node('t', 'trigger', { trigger: 'INBOUND_MESSAGE', keywords: '' })]} onChangeSpy={spy} />
    );
    expect(screen.getByDisplayValue('https://hooks.test/wa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en('ai.automation.inspector.trigger.copyWebhook') }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://hooks.test/wa'));

    type(en('ai.automation.inspector.trigger.keywords'), 'hi, hello');
    await waitFor(() => expect(lastConfig(spy)).toMatchObject({ keywords: 'hi, hello', trigger: 'INBOUND_MESSAGE' }));

    fireEvent.mouseDown(screen.getByRole('combobox', { name: label('ai.automation.inspector.trigger.kind') }));
    fireEvent.click(await screen.findByRole('option', { name: en('ai.automation.trigger.MANUAL') }));
    await waitFor(() => expect(screen.getByText(en('ai.automation.inspector.trigger.manualHint'))).toBeInTheDocument());
    expect(screen.queryByLabelText(en('ai.automation.inspector.trigger.keywords'))).not.toBeInTheDocument();
  });

  it('trigger: warns when the webhook secret is missing, and when an email flow has no mailbox', () => {
    const { unmount } = renderWithProviders(
      <Harness initial={[node('t', 'trigger', { trigger: 'INBOUND_MESSAGE' })]} options={{ ...OPTIONS, webhook_secret_set: false }} />
    );
    expect(screen.getByText(en('ai.automation.inspector.trigger.webhookSecretMissing'))).toBeInTheDocument();
    unmount();

    renderWithProviders(
      <Harness
        channel="EMAIL"
        initial={[node('t', 'trigger', { trigger: 'INBOUND_EMAIL', mailbox: '' })]}
        options={{ ...OPTIONS, mailboxes: [] }}
      />
    );
    expect(screen.getByText(en('ai.automation.inspector.trigger.mailboxNone'))).toBeInTheDocument();
  });

  it('condition: hides the value for is_empty and writes the chosen operator', async () => {
    const spy = vi.fn();
    renderWithProviders(
      <Harness initial={[node('c', 'condition', { variable: 'message.text', operator: 'weird', value: '' })]} onChangeSpy={spy} />
    );
    // An unknown stored operator falls back to "contains" and still shows the value.
    expect(screen.getByLabelText(en('ai.automation.inspector.condition.value'))).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: label('ai.automation.inspector.condition.operator') }));
    fireEvent.click(await screen.findByRole('option', { name: en('ai.automation.inspector.condition.ops.is_empty') }));
    await waitFor(() => expect(lastConfig(spy)).toMatchObject({ operator: 'is_empty' }));
    expect(screen.queryByLabelText(en('ai.automation.inspector.condition.value'))).not.toBeInTheDocument();
  });

  it('condition and set-variable: show a validation message under an invalid field', async () => {
    renderWithProviders(<Harness initial={[node('v', 'set_variable', { name: 'ok', value: '' })]} />);
    type(label('ai.automation.inspector.setVariable.name'), '1bad');
    expect(await screen.findByText(en('ai.automation.inspector.ai.outputInvalid'))).toBeInTheDocument();
  });

  it('wait and delay: write numbers, not strings', async () => {
    const spy = vi.fn();
    const { unmount } = renderWithProviders(<Harness initial={[node('w', 'wait_for_reply', {})]} onChangeSpy={spy} />);
    expect(screen.getByLabelText(en('ai.automation.inspector.wait.timeout'))).toHaveValue(24);
    type(en('ai.automation.inspector.wait.timeout'), '48');
    await waitFor(() => expect(lastConfig(spy)).toMatchObject({ timeout_hours: 48 }));
    unmount();

    const delaySpy = vi.fn();
    renderWithProviders(<Harness initial={[node('d', 'delay', { amount: 2, unit: 'nope' })]} onChangeSpy={delaySpy} />);
    expect(screen.getByLabelText(en('ai.automation.inspector.delay.amount'))).toHaveValue(2);
    type(en('ai.automation.inspector.delay.amount'), '5');
    await waitFor(() => expect(lastConfig(delaySpy)).toMatchObject({ amount: 5, unit: 'HOURS' }));
  });

  it('http: hides the body for GET', async () => {
    renderWithProviders(<Harness initial={[node('h', 'http_request', { method: 'POST', url: 'https://x.test', output_var: '' })]} />);
    expect(screen.getByLabelText(en('ai.automation.inspector.http.body'))).toBeInTheDocument();
    expect(screen.getByLabelText(en('ai.automation.inspector.http.output'))).toHaveValue('webhook');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: label('ai.automation.inspector.http.method') }));
    fireEvent.click(await screen.findByRole('option', { name: 'GET' }));
    await waitFor(() => expect(screen.queryByLabelText(en('ai.automation.inspector.http.body'))).not.toBeInTheDocument());
  });

  it('ai compose and classify: write instructions and split labels per line', async () => {
    const spy = vi.fn();
    const { unmount } = renderWithProviders(
      <Harness initial={[node('a', 'ai_compose', { instructions: '', output_var: 'ai_reply' })]} onChangeSpy={spy} />
    );
    type(label('ai.automation.inspector.ai.instructions'), 'Reply kindly');
    await waitFor(() => expect(lastConfig(spy)).toMatchObject({ instructions: 'Reply kindly', output_var: 'ai_reply' }));
    unmount();

    const classifySpy = vi.fn();
    renderWithProviders(<Harness initial={[node('k', 'ai_classify', { instructions: 'Sort', labels: ['x'] })]} onChangeSpy={classifySpy} />);
    expect(screen.getByLabelText(label('ai.automation.inspector.ai.labels'))).toHaveValue('x');
    type(label('ai.automation.inspector.ai.labels'), 'Sales\n  Help \n\n');
    await waitFor(() => expect(lastConfig(classifySpy)).toMatchObject({ labels: ['Sales', 'Help'], instructions: 'Sort' }));
    expect(lastConfig(classifySpy)).not.toHaveProperty('labels_text');
  });

  it('send email: only the chosen template variables travel', async () => {
    const spy = vi.fn();
    renderWithProviders(
      <Harness
        channel="EMAIL"
        initial={[node('m', 'send_email', { template_slug: 'automation-message', category: '', vars: { body: 'hello', stale: 'x' } })]}
        onChangeSpy={spy}
      />
    );
    expect(screen.getByText('Re: you')).toBeInTheDocument();
    type(en('ai.automation.inspector.email.subject'), 'Welcome');
    await waitFor(() => expect(lastConfig(spy)).toMatchObject({ subject: 'Welcome', category: 'notification', vars: { body: 'hello' } }));
    expect(lastConfig(spy).vars).not.toHaveProperty('stale');
  });

  it('send email: warns when there is no sender or template', () => {
    renderWithProviders(
      <Harness channel="EMAIL" initial={[node('m', 'send_email', {})]} options={{ ...OPTIONS, email_senders: [], email_templates: [] }} />
    );
    expect(screen.getByText(en('ai.automation.inspector.email.noSenders'))).toBeInTheDocument();
    expect(screen.getByText(en('ai.automation.inspector.email.noTemplates'))).toBeInTheDocument();
  });
});

describe('NodeInspector — lists only shown when opened', () => {
  it('trigger: names each mailbox, marks a paused one, and writes the pick', async () => {
    const spy = vi.fn();
    renderWithProviders(
      <Harness channel="EMAIL" initial={[node('t', 'trigger', { trigger: 'INBOUND_EMAIL', mailbox: 'in@duncit.test' })]} onChangeSpy={spy} />
    );
    fireEvent.mouseDown(screen.getByRole('combobox', { name: label('ai.automation.inspector.trigger.mailbox') }));
    expect(await screen.findByRole('option', { name: 'Inbox — in@duncit.test' })).toBeInTheDocument();
    const paused = screen.getByRole('option', { name: `old@duncit.test ${en('ai.automation.inspector.trigger.mailboxPaused')}` });
    fireEvent.click(paused);
    await waitFor(() => expect(lastConfig(spy)).toMatchObject({ trigger: 'INBOUND_EMAIL', mailbox: 'old@duncit.test' }));
  });

  it('send email: shows a sender without an address by its name alone', async () => {
    const options: AutomationOptions = {
      ...OPTIONS,
      email_senders: [...OPTIONS.email_senders, { id: 'snd2', name: 'Ops', from_address: '', is_default: false }],
    };
    renderWithProviders(<Harness channel="EMAIL" initial={[node('m', 'send_email', {})]} options={options} />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: label('ai.automation.inspector.email.sender') }));
    expect(await screen.findByRole('option', { name: 'Support — help@duncit.test' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ops' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: en('ai.automation.inspector.email.defaultSender') })).toBeInTheDocument();
  });

  it('send email: a template that is no longer offered carries no variables along', async () => {
    const spy = vi.fn();
    renderWithProviders(
      <Harness channel="EMAIL" initial={[node('m', 'send_email', { template_slug: 'retired', vars: { body: 'old text' } })]} onChangeSpy={spy} />
    );
    // No template matched, so no subject preview and no variable fields.
    expect(screen.queryByText('Re: you')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(en('ai.automation.inspector.email.variable', { name: 'body' }))).not.toBeInTheDocument();
    type(en('ai.automation.inspector.email.subject'), 'Hello');
    await waitFor(() => expect(lastConfig(spy)).toMatchObject({ subject: 'Hello', template_slug: 'retired' }));
    expect(lastConfig(spy).vars).toEqual({});
  });
});

describe('ExitConnections', () => {
  it('reads an arrow with no exit name as the step’s "next" exit', () => {
    const steps = [node('a', 'delay', { amount: 1, unit: 'HOURS' }), node('b', 'http_request', { url: 'https://x.test' })];
    renderWithProviders(
      <ExitConnections node={steps[0]} nodes={steps} edges={[{ id: 'e1', source: 'a', target: 'b' }]} onConnect={vi.fn()} onDisconnect={vi.fn()} />
    );
    const next = within(screen.getByTestId('automation-exit-next')).getByRole('combobox');
    expect(next).toHaveTextContent(en('ai.automation.kinds.http_request'));
    expect(next).toHaveTextContent('https://x.test');
  });
});

describe('useNodeForm', () => {
  it('resets to another step’s settings without reporting it as an edit, then reports a real one', () => {
    const onChange = vi.fn();
    const schema = triggerSchema();
    const { result, rerender } = renderHook(
      ({ id, values }) => useNodeForm(id, schema, values, onChange),
      { initialProps: { id: 't1', values: { trigger: 'MANUAL', keywords: '', mailbox: '' } as TriggerValues } }
    );
    rerender({ id: 't2', values: { trigger: 'INBOUND_MESSAGE', keywords: 'hi', mailbox: '' } });
    expect(result.current.getValues()).toEqual({ trigger: 'INBOUND_MESSAGE', keywords: 'hi', mailbox: '' });
    expect(onChange).not.toHaveBeenCalled();

    act(() => result.current.setValue('keywords', 'hi, hello'));
    expect(onChange).toHaveBeenCalledWith({ trigger: 'INBOUND_MESSAGE', keywords: 'hi, hello', mailbox: '' });
  });
});
