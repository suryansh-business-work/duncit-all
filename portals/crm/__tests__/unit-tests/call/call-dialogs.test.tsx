import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { AiCallDialog, PortalCallDialog, type PortalCallLead } from '@/components/call';
import { CRM_CALL_FROM_NUMBER, CRM_CALL_PROMPTS, START_CRM_AI_CALL, START_CRM_PORTAL_CALL } from '@/api/call.gql';
import { CRM_CALL_EVENT, getCallSocket } from '@/lib/callSocket';
import { clearToken, setToken } from '@/lib/session';
import { renderWithApollo } from '../helpers/renderWithApollo';
import type { FakeSocket } from './fakeSocket';

const created = vi.hoisted(() => ({ sockets: [] as FakeSocket[] }));

vi.mock('socket.io-client', async () => {
  const { createFakeSocket } = await import('./fakeSocket');
  return {
    io: vi.fn((_origin: string, options: { auth?: { token?: string } }) => {
      const socket = createFakeSocket(options);
      created.sockets.push(socket);
      return socket;
    }),
  };
});

// No canvas or microphone under jsdom; the wave's own suite covers it.
vi.mock('@wavesurfer/react', () => ({ useWavesurfer: () => ({ wavesurfer: null }) }));

const lead: PortalCallLead = {
  to: '9812345678',
  entityType: 'VENUE_LEAD',
  entityId: 'venue-1',
  displayName: 'Grand Hall',
  contactName: 'Meera Shah',
};

const fromNumberMock = (value: string | null): MockedResponse => ({
  request: { query: CRM_CALL_FROM_NUMBER },
  result: { data: { crmCallFromNumber: value } },
});

const callResult = (overrides: Record<string, unknown>) => ({
  ok: true,
  message: 'Call placed',
  log_id: 'log-1',
  external_id: 'CA123',
  ...overrides,
});

const push = (payload: Record<string, unknown>) => {
  act(() => {
    (created.sockets.at(-1) as FakeSocket).push(CRM_CALL_EVENT, payload);
  });
};

beforeEach(() => {
  setToken('fixture-agent');
});

afterEach(() => {
  clearToken();
  getCallSocket();
  created.sockets.length = 0;
});

describe('PortalCallDialog', () => {
  const portalMock = (variables: Record<string, unknown>, outcome: { result?: Record<string, unknown>; error?: Error }): MockedResponse => ({
    request: { query: START_CRM_PORTAL_CALL, variables },
    ...(outcome.error ? { error: outcome.error } : { result: { data: { startCrmPortalCall: outcome.result } } }),
  });
  const vars = { entity: 'VENUE_LEAD', id: 'venue-1', contact_number: '9812345678', contact_name: 'Meera Shah' };

  const renderPortal = (mocks: MockedResponse[], callLead: PortalCallLead = lead) => {
    const onClose = vi.fn();
    renderWithApollo(<PortalCallDialog open lead={callLead} onClose={onClose} />, mocks);
    return { onClose };
  };

  it('places the call and follows its live status to the end', async () => {
    const { onClose } = renderPortal([fromNumberMock('+14155550100'), portalMock(vars, { result: callResult({}) })]);

    expect(await screen.findByText('+14155550100')).toBeInTheDocument();
    expect(screen.getByText('+91 9812345678')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('A direct two-way call from your Twilio number to this contact.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start Call' }));
    expect(await screen.findByText('Connecting…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Call' })).toBeNull();

    push({ log_id: 'another-call', status: 'COMPLETED' });
    expect(screen.getByText('Connecting…')).toBeInTheDocument();
    push({ log_id: 'log-1', status: 'RINGING' });
    expect(screen.getByText('Ringing…')).toBeInTheDocument();
    push({ log_id: 'log-1', status: 'COMPLETED' });
    expect(screen.getByText('Call over')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reports the server’s reason when the call is refused', async () => {
    renderPortal([fromNumberMock(null), portalMock(vars, { result: callResult({ ok: false, message: 'Twilio number not verified', log_id: null }) })]);

    expect(await screen.findByText('—')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Call' }));

    expect(await screen.findByText('Twilio number not verified')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Call' })).toBeInTheDocument();
  });

  it('shows a transport failure and ignores status pushes before a call is placed', async () => {
    const { onClose } = renderPortal(
      [fromNumberMock('+14155550100'), portalMock({ ...vars, contact_name: null }, { error: new Error('Call service down') })],
      { ...lead, contactName: undefined },
    );
    await screen.findByText('+14155550100');

    push({ log_id: 'log-1', status: 'RINGING' });
    expect(screen.getByText('Ready')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start Call' }));
    expect(await screen.findByText('Call service down')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays ready when the server accepts the call without logging it', async () => {
    renderPortal([fromNumberMock('+14155550100'), portalMock(vars, { result: callResult({ log_id: null }) })]);
    await screen.findByText('+14155550100');

    fireEvent.click(screen.getByRole('button', { name: 'Start Call' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Start Call' })).toBeEnabled());
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('titles itself blank with no lead', () => {
    renderWithApollo(<PortalCallDialog open={false} lead={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('AiCallDialog', () => {
  const promptsMock = (prompts: Record<string, unknown>[]): MockedResponse => ({
    request: { query: CRM_CALL_PROMPTS, variables: { filter: { is_active: true } } },
    result: { data: { crmCallPrompts: prompts } },
    maxUsageCount: 5,
  });
  const prompt = (overrides: Record<string, unknown>) => ({
    id: 'p1',
    name: 'Venue pitch',
    description: 'Pitch Duncit to venues',
    context: 'You are calling a venue owner…',
    language: 'hi-IN',
    is_active: true,
    created_by: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  });
  const aiMock = (variables: Record<string, unknown>, outcome: { result?: Record<string, unknown>; error?: Error }): MockedResponse => ({
    request: { query: START_CRM_AI_CALL, variables },
    ...(outcome.error ? { error: outcome.error } : { result: { data: { startCrmAiCall: outcome.result } } }),
  });
  const baseVars = { entity: 'VENUE_LEAD', id: 'venue-1', contact_number: '9812345678', prompt_id: 'p1', voice: null, contact_name: 'Meera Shah' };

  const renderAi = (mocks: MockedResponse[], callLead: PortalCallLead = lead) => {
    const onClose = vi.fn();
    renderWithApollo(<AiCallDialog open lead={callLead} onClose={onClose} />, mocks);
    return { onClose };
  };

  const choose = async (field: RegExp, option: string) => {
    // The prompt picker stays disabled until the prompts have loaded.
    await waitFor(() => expect(screen.getByRole('combobox', { name: field })).not.toHaveAttribute('aria-disabled', 'true'));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: field }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: option }));
  };

  it('points to the prompt catalogue when no prompt is active', async () => {
    renderAi([promptsMock([]), fromNumberMock('+14155550100')]);
    expect(await screen.findByText('No active prompts — add one under AI Call Prompts.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start AI call' })).toBeDisabled();
  });

  it('places an AI call with the chosen prompt and voice, then follows it', async () => {
    const { onClose } = renderAi([
      promptsMock([prompt({}), prompt({ id: 'p2', name: 'Generic intro', language: 'auto' })]),
      fromNumberMock('+14155550100'),
      aiMock({ ...baseVars, voice: 'anushka' }, { result: callResult({ log_id: 'log-ai' }) }),
    ]);

    await choose(/Static Content prompt/, 'Venue pitch · hi-IN');
    await choose(/Servam voice/, 'Anushka (female)');
    fireEvent.click(screen.getByRole('button', { name: 'Start AI call' }));

    expect(await screen.findByText('AI VOICE')).toBeInTheDocument();
    expect(screen.getByText('Connecting…')).toBeInTheDocument();
    push({ log_id: 'log-ai', status: 'IN_PROGRESS' });
    expect(screen.getByText('In call')).toBeInTheDocument();
    push({ log_id: 'log-ai', status: 'NO_ANSWER' });
    expect(screen.getByText('No answer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lists a language-neutral prompt without a language tag', async () => {
    renderAi([promptsMock([prompt({ id: 'p2', name: 'Generic intro', language: 'auto' })]), fromNumberMock(null)]);

    await waitFor(() => expect(screen.getByRole('combobox', { name: /Static Content prompt/ })).not.toHaveAttribute('aria-disabled', 'true'));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Static Content prompt/ }));
    expect(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Generic intro' })).toBeInTheDocument();
  });

  it('reports a refused AI call and a failed one', async () => {
    renderAi(
      [
        promptsMock([prompt({})]),
        fromNumberMock(null),
        aiMock({ ...baseVars, contact_name: null }, { result: callResult({ ok: false, message: 'Servam quota exhausted' }) }),
        aiMock({ ...baseVars, contact_name: null }, { error: new Error('AI call service down') }),
      ],
      { ...lead, contactName: undefined },
    );

    await choose(/Static Content prompt/, 'Venue pitch · hi-IN');
    fireEvent.click(screen.getByRole('button', { name: 'Start AI call' }));
    expect(await screen.findByText('Servam quota exhausted')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start AI call' }));
    expect(await screen.findByText('AI call service down')).toBeInTheDocument();
  });

  it('stays on the form when the call is accepted without a log', async () => {
    const { onClose } = renderAi([
      promptsMock([prompt({})]),
      fromNumberMock(null),
      aiMock(baseVars, { result: callResult({ log_id: null }) }),
    ]);

    await choose(/Static Content prompt/, 'Venue pitch · hi-IN');
    push({ log_id: 'log-ai', status: 'RINGING' });
    fireEvent.click(screen.getByRole('button', { name: 'Start AI call' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Start AI call' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
