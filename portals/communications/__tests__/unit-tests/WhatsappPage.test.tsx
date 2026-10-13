import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../testkit';

const m = vi.hoisted(() => ({
  setup: undefined as unknown,
  refetch: vi.fn(),
  actions: {} as Record<string, unknown>,
  onChanged: undefined as undefined | (() => void),
  logsRefetch: vi.fn(),
}));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: () => ({ data: m.setup, refetch: m.refetch }),
}));
vi.mock('../../src/pages/whatsapp-page/useWaCampaignActions', () => ({
  useWaCampaignActions: (onChanged: () => void) => {
    m.onChanged = onChanged;
    return m.actions;
  },
}));
vi.mock('../../src/pages/whatsapp-page/wa-dashboard', () => ({
  default: () => <div>tab:dashboard</div>,
}));
vi.mock('../../src/pages/whatsapp-page/wa-automation', () => ({
  default: () => <div>tab:automation</div>,
}));
vi.mock('../../src/pages/whatsapp-page/wa-settings', () => ({
  default: (p: { names: unknown[]; onAddName: unknown }) => (
    <div>
      tab:settings:{p.names.length}:{String(p.onAddName === m.actions.addName)}
    </div>
  ),
}));
vi.mock('../../src/pages/whatsapp-page/wa-aisensy/AisensyTemplates', () => ({
  default: (p: { onOpenLogs: (c: string[]) => void }) => (
    <button type="button" onClick={() => p.onOpenLogs(['tpl_camp'])}>
      tab:templates
    </button>
  ),
}));
vi.mock('../../src/pages/whatsapp-page/wa-aisensy/AisensyCampaigns', () => ({
  default: (p: {
    onSend: (c: unknown) => void;
    onTest: (c: unknown) => void;
    names: unknown[];
  }) => (
    <div>
      <button type="button" onClick={() => p.onSend({ name: 'diwali_camp' })}>
        start-send
      </button>
      <button type="button" onClick={() => p.onTest({ name: 'diwali_camp' })}>
        start-test
      </button>
      <span>names:{p.names.length}</span>
    </div>
  ),
}));
vi.mock('../../src/pages/whatsapp-page/wa-logs', () => ({
  default: (p: {
    campaigns: string[];
    onClearCampaigns: () => void;
    onDuplicate: (c: unknown) => void;
    refetchRef: { current: (() => void) | null };
  }) => {
    p.refetchRef.current = m.logsRefetch;
    return (
      <div>
        <span>logs:{p.campaigns.join(',')}</span>
        <button type="button" onClick={p.onClearCampaigns}>
          clear-logs
        </button>
        <button
          type="button"
          onClick={() =>
            p.onDuplicate({
              name: 'Old',
              wa_campaign_name: 'old_camp',
              audience: 'ALL_USERS',
              audience_list_id: null,
              user_ids: [],
              contacts: [],
              template_params: ['x'],
            })
          }
        >
          duplicate-send
        </button>
      </div>
    );
  },
}));
vi.mock('../../src/pages/whatsapp-page/wa-campaign-form', async (io) => ({
  ...(await io<typeof import('../../src/pages/whatsapp-page/wa-campaign-form')>()),
  WaCampaignForm: (p: {
    open: boolean;
    campaignName: string;
    initial: { name: string } | null;
    names: unknown[];
    variables: unknown[];
    audienceLists: unknown[];
    onClose: () => void;
    onSubmit: (i: unknown) => void;
  }) =>
    p.open ? (
      <div>
        <span>
          send-form:{p.campaignName}:{p.initial?.name ?? 'blank'}
        </span>
        <span>
          form-data:{p.names.length}:{p.variables.length}:{p.audienceLists.length}
        </span>
        <button type="button" onClick={() => p.onSubmit({ name: 'x' })}>
          submit-send
        </button>
        <button type="button" onClick={p.onClose}>
          close-send
        </button>
      </div>
    ) : null,
}));
vi.mock('../../src/pages/whatsapp-page/wa-test-form', () => ({
  WaTestForm: (p: { open: boolean; campaignName: string; names: unknown[]; onClose: () => void }) =>
    p.open ? (
      <div>
        <span>test-form:{p.campaignName}:{p.names.length}</span>
        <button type="button" onClick={p.onClose}>
          close-test
        </button>
      </div>
    ) : null,
}));

import WhatsappCampaignsPage from '../../src/pages/whatsapp-page';

const mount = (tab = '') =>
  renderWithProviders(<WhatsappCampaignsPage />, {
    initialEntries: [tab ? `/?selectedtab=${tab}` : '/'],
  });

beforeEach(() => {
  m.setup = {
    waCampaignConfigured: true,
    waCampaignNames: [{ id: 'n1', name: 'a', description: '' }],
    waCampaignVariables: [],
    audienceLists: [],
  };
  m.refetch.mockReset().mockResolvedValue({});
  m.logsRefetch.mockReset();
  m.actions = {
    send: vi.fn().mockResolvedValue(true),
    testMessage: vi.fn(),
    addName: vi.fn(),
    removeName: vi.fn(),
    sending: false,
    testing: false,
    namesBusy: false,
  };
});

describe('WhatsappCampaignsPage', () => {
  it('opens on the dashboard', () => {
    mount();
    expect(screen.getByText('tab:dashboard')).toBeInTheDocument();
  });

  it.each([
    ['automation', 'tab:automation'],
    ['templates', 'tab:templates'],
    ['logs', 'logs:'],
    ['settings', 'tab:settings:1:true'],
  ])('shows the %s tab from the URL', (tab, text) => {
    mount(tab);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('warns about a missing AiSensy key on every tab but settings', () => {
    m.setup = { ...(m.setup as object), waCampaignConfigured: false };
    const first = mount('campaigns');
    expect(screen.getByText(/No AiSensy API key yet/)).toBeInTheDocument();
    first.unmount();
    mount('settings');
    expect(screen.queryByText(/No AiSensy API key yet/)).not.toBeInTheDocument();
  });

  it('opens the send form pointed at the campaign that was chosen', () => {
    mount('campaigns');
    fireEvent.click(screen.getByRole('button', { name: 'start-send' }));
    expect(screen.getByText('send-form:diwali_camp:blank')).toBeInTheDocument();
  });

  it('closes the form after a send that went through and refreshes the tables', async () => {
    mount('campaigns');
    fireEvent.click(screen.getByRole('button', { name: 'start-send' }));
    fireEvent.click(screen.getByRole('button', { name: 'submit-send' }));
    await waitFor(() => expect(screen.queryByText(/send-form:/)).not.toBeInTheDocument());
    expect(m.actions.send).toHaveBeenCalledWith({ name: 'x' });
    m.onChanged?.();
    expect(m.refetch).toHaveBeenCalled();
  });

  it('keeps the form open when the send failed', async () => {
    m.actions.send = vi.fn().mockResolvedValue(false);
    mount('campaigns');
    fireEvent.click(screen.getByRole('button', { name: 'start-send' }));
    fireEvent.click(screen.getByRole('button', { name: 'submit-send' }));
    await waitFor(() => expect(m.actions.send).toHaveBeenCalled());
    expect(screen.getByText(/send-form:/)).toBeInTheDocument();
  });

  it('opens the test form for a campaign', () => {
    mount('campaigns');
    fireEvent.click(screen.getByRole('button', { name: 'start-test' }));
    expect(screen.getByText('test-form:diwali_camp:1')).toBeInTheDocument();
  });

  it('closes the send form and the test form without sending anything', () => {
    mount('campaigns');
    fireEvent.click(screen.getByRole('button', { name: 'start-send' }));
    fireEvent.click(screen.getByRole('button', { name: 'close-send' }));
    expect(screen.queryByText(/send-form:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'start-test' }));
    fireEvent.click(screen.getByRole('button', { name: 'close-test' }));
    expect(screen.queryByText(/test-form:/)).not.toBeInTheDocument();
    expect(m.actions.send).not.toHaveBeenCalled();
  });

  it('hands the forms the loaded setup lists', () => {
    m.setup = { ...(m.setup as object), waCampaignVariables: [{ key: 'v' }], audienceLists: [{ id: 'l1' }, { id: 'l2' }] };
    mount('campaigns');
    fireEvent.click(screen.getByRole('button', { name: 'start-send' }));
    expect(screen.getByText('form-data:1:1:2')).toBeInTheDocument();
  });

  it('gives every tab and form empty lists, and no missing-key warning, before the setup has loaded', () => {
    m.setup = undefined;
    const campaigns = mount('campaigns');
    expect(screen.getByText('names:0')).toBeInTheDocument();
    expect(screen.queryByText(/No AiSensy API key yet/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'start-send' }));
    expect(screen.getByText('form-data:0:0:0')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'start-test' }));
    expect(screen.getByText('test-form:diwali_camp:0')).toBeInTheDocument();
    campaigns.unmount();

    const settings = mount('settings');
    expect(screen.getByText('tab:settings:0:true')).toBeInTheDocument();
    settings.unmount();

    mount('logs');
    expect(screen.getByText('logs:')).toBeInTheDocument();
  });

  it('refreshes the open Logs table when a change lands', () => {
    mount('logs');
    m.onChanged?.();
    expect(m.refetch).toHaveBeenCalled();
    expect(m.logsRefetch).toHaveBeenCalledTimes(1);
  });

  it('does not fail a change when the setup refetch rejects', async () => {
    m.refetch.mockRejectedValue(new Error('offline'));
    mount('logs');
    m.onChanged?.();
    await waitFor(() => expect(m.refetch).toHaveBeenCalled());
    expect(m.logsRefetch).toHaveBeenCalledTimes(1);
  });

  it('opens Logs narrowed to a template campaigns, then clears the narrowing', () => {
    mount('templates');
    fireEvent.click(screen.getByRole('button', { name: 'tab:templates' }));
    expect(screen.getByText('logs:tpl_camp')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'clear-logs' }));
    expect(screen.getByText('logs:')).toBeInTheDocument();
  });

  it('duplicates a past send into a prefilled form named as a copy', () => {
    mount('logs');
    fireEvent.click(screen.getByRole('button', { name: 'duplicate-send' }));
    expect(screen.getByText('send-form:old_camp:Old (copy)')).toBeInTheDocument();
  });
});
