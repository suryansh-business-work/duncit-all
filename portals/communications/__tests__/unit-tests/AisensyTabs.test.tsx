import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AisensyCampaign, AisensyTemplate } from '../../src/pages/whatsapp-page/queries';
import { renderWithProviders } from '../testkit';

const m = vi.hoisted(() => ({
  catalogue: {} as Record<string, unknown>,
  counts: new Map<string, { sent: number; attempts: number }>(),
  drafts: {} as Record<string, unknown>,
  confirm: vi.fn(),
  onChanged: undefined as undefined | (() => void),
}));
vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../mocks/table-stub')).StubTable,
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  useConfirm: () => m.confirm,
}));
vi.mock('../../src/pages/whatsapp-page/wa-aisensy/useAisensyCatalogue', async (io) => ({
  ...(await io<typeof import('../../src/pages/whatsapp-page/wa-aisensy/useAisensyCatalogue')>()),
  useAisensyCatalogue: () => m.catalogue,
}));
vi.mock('../../src/pages/whatsapp-page/wa-aisensy/useWaSendCounts', async (io) => ({
  ...(await io<typeof import('../../src/pages/whatsapp-page/wa-aisensy/useWaSendCounts')>()),
  useWaSendCounts: () => m.counts,
}));
vi.mock('../../src/pages/whatsapp-page/wa-aisensy/useAisensyDrafts', () => ({
  useAisensyDrafts: (onChanged: () => void) => {
    m.onChanged = onChanged;
    return m.drafts;
  },
}));
vi.mock('../../src/pages/whatsapp-page/wa-aisensy/create-campaign-form', () => ({
  CreateCampaignForm: (p: { open: boolean; orphans: { name: string }[]; onClose: () => void }) =>
    p.open ? (
      <div>
        campaign-form:{p.orphans.map((o) => o.name).join(',')}
        <button type="button" onClick={p.onClose}>
          close-campaign-form
        </button>
      </div>
    ) : null,
}));
vi.mock('../../src/pages/whatsapp-page/wa-aisensy/create-template-form', () => ({
  CreateTemplateForm: (p: { open: boolean; onClose: () => void }) =>
    p.open ? (
      <div>
        template-form
        <button type="button" onClick={p.onClose}>
          close-template-form
        </button>
      </div>
    ) : null,
}));

import AisensyCampaigns from '../../src/pages/whatsapp-page/wa-aisensy/AisensyCampaigns';
import AisensyTemplates from '../../src/pages/whatsapp-page/wa-aisensy/AisensyTemplates';

const template = (over: Partial<AisensyTemplate> = {}): AisensyTemplate => ({
  id: 'tpl-1',
  name: 'diwali_tpl',
  status: 'APPROVED',
  category: 'MARKETING',
  language: 'en',
  body: 'Hello {{1}}',
  param_count: 1,
  header: '',
  header_format: '',
  needs_media: false,
  footer: '',
  buttons: [],
  cta_buttons: [],
  ...over,
});

const campaign = (over: Partial<AisensyCampaign> = {}): AisensyCampaign => ({
  name: 'diwali_camp',
  status: 'Live',
  template_name: 'diwali_tpl',
  type: 'API',
  media_url: '',
  media_filename: '',
  ...over,
});

const catalogue = (over: Record<string, unknown> = {}) => ({
  configured: true,
  campaigns: [campaign(), campaign({ name: 'paused_camp', status: 'Paused', template_name: '' })],
  templates: [template(), template({ id: 'tpl-2', name: 'orphan_tpl' })],
  loading: false,
  error: undefined,
  refetch: vi.fn().mockResolvedValue({}),
  ...over,
});

beforeEach(() => {
  m.catalogue = catalogue();
  m.counts = new Map([['diwali_camp', { sent: 8, attempts: 10 }]]);
  m.drafts = {
    creatingCampaign: false,
    creatingTemplate: false,
    deletingTemplate: false,
    submitCampaign: vi.fn(),
    submitTemplate: vi.fn(),
    removeTemplate: vi.fn(),
  };
  m.confirm.mockReset();
});

describe('AisensyCampaigns', () => {
  const mount = (over: Record<string, unknown> = {}) => {
    const h = { onSend: vi.fn(), onTest: vi.fn(), onOpenLogs: vi.fn() };
    renderWithProviders(<AisensyCampaigns names={[]} {...h} {...over} />);
    return h;
  };

  it('lists AiSensy campaigns with their live status and send counts', async () => {
    mount();
    const row = await screen.findByTestId('row-diwali_camp');
    expect(within(row).getByText('Live')).toBeInTheDocument();
    expect(within(row).getByText('8')).toBeInTheDocument();
    expect(within(row).getByText('of 10')).toBeInTheDocument();
  });

  it('sends, tests and opens logs for a Live campaign', async () => {
    const h = mount();
    const row = await screen.findByTestId('row-diwali_camp');
    fireEvent.click(within(row).getByRole('button', { name: 'Send this campaign' }));
    expect(h.onSend).toHaveBeenCalledWith(expect.objectContaining({ name: 'diwali_camp' }));
    fireEvent.click(within(row).getByRole('button', { name: /test message/i }));
    expect(h.onTest).toHaveBeenCalledWith(expect.objectContaining({ name: 'diwali_camp' }));
    fireEvent.click(within(row).getByRole('button', { name: '8 sent of 10 tried — open the log' }));
    expect(h.onOpenLogs).toHaveBeenCalledWith(['diwali_camp']);
  });

  it('disables Send on a campaign AiSensy does not call Live', async () => {
    mount();
    const row = await screen.findByTestId('row-paused_camp');
    expect(
      within(row).getByRole('button', { name: 'Only a Live campaign can be sent' })
    ).toBeDisabled();
  });

  it('shows 0 without a link for a campaign nothing was ever sent on', async () => {
    mount();
    const row = await screen.findByTestId('row-paused_camp');
    expect(within(row).getByText('0')).toBeInTheDocument();
  });

  it('opens the campaign detail with the template it sends and a note when it has none', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'open-diwali_camp' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('diwali_tpl')).toBeInTheDocument();
    expect(within(dialog).getByText('1 parameter')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'open-paused_camp' }));
    expect(await screen.findByText(/did not say which template/)).toBeInTheDocument();
  });

  it('names a template AiSensy did not return', async () => {
    m.catalogue = catalogue({ templates: [], campaigns: [campaign({ template_name: 'gone_tpl' })] });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'open-diwali_camp' }));
    expect(await screen.findByText(/did not return the template/)).toBeInTheDocument();
  });

  it('warns about approved templates no campaign sends, and opens the create form', async () => {
    mount();
    expect(await screen.findByText('orphan_tpl')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /new campaign/i })[0]);
    expect(await screen.findByText(/campaign-form:orphan_tpl/)).toBeInTheDocument();
  });

  it('opens the create form from the warning about templates no campaign sends, and closes it', async () => {
    mount();
    const warning = (await screen.findByText('orphan_tpl')).closest('.MuiAlert-root') as HTMLElement;
    fireEvent.click(within(warning).getByRole('button', { name: /campaign/i }));
    expect(await screen.findByText(/campaign-form:orphan_tpl/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close-campaign-form' }));
    await waitFor(() => expect(screen.queryByText(/campaign-form:/)).not.toBeInTheDocument());
  });

  it('shows a dash for a campaign AiSensy gave no type', async () => {
    m.catalogue = catalogue({ campaigns: [campaign({ type: '' })] });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'open-diwali_camp' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Type').parentElement).toHaveTextContent('—');
  });

  it('re-reads the catalogue after a draft changes it, and tolerates that read failing', async () => {
    const refetch = vi.fn().mockRejectedValue(new Error('offline'));
    m.catalogue = catalogue({ refetch });
    mount();
    await screen.findByTestId('row-diwali_camp');
    m.onChanged?.();
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });

  it('falls back to the saved names with a warning when the Project API is not answering', async () => {
    m.catalogue = catalogue({ configured: false, campaigns: [], templates: [] });
    mount({ names: [{ id: 'n1', name: 'saved_camp', description: 'Festival' }] });
    expect(await screen.findByTestId('row-saved_camp')).toBeInTheDocument();
    expect(screen.getByText(/Project API is not answering/)).toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'Send this campaign' });
    expect(send).toBeEnabled();
  });

  it('falls back to the saved warning when AiSensy answers with an error', async () => {
    m.catalogue = catalogue({ error: new Error('Invalid project key'), campaigns: [campaign()] });
    mount({ names: [{ id: 'n1', name: 'saved_camp', description: '' }] });
    expect(await screen.findByTestId('row-saved_camp')).toBeInTheDocument();
    expect(screen.getByText(/Project API is not answering/)).toBeInTheDocument();
  });
});

describe('AisensyTemplates', () => {
  const mount = () => {
    const onOpenLogs = vi.fn();
    renderWithProviders(<AisensyTemplates onOpenLogs={onOpenLogs} />);
    return { onOpenLogs };
  };

  it('lists templates with the sum of the campaigns that send them', async () => {
    const { onOpenLogs } = mount();
    const row = await screen.findByTestId('row-diwali_tpl-en');
    expect(within(row).getByText('Approved'.toUpperCase(), { exact: false })).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: '8 sent of 10 tried — open the log' }));
    expect(onOpenLogs).toHaveBeenCalledWith(['diwali_camp']);
  });

  it('opens the template detail with its facts', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'open-diwali_tpl-en' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('MARKETING')).toBeInTheDocument();
    expect(within(dialog).getByText('None')).toBeInTheDocument();
  });

  it('shows a dash for a template with no category or language, and closes the detail', async () => {
    m.catalogue = catalogue({ templates: [template({ category: '', language: '' })] });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /^open-diwali_tpl/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Category').parentElement).toHaveTextContent('—');
    expect(within(dialog).getByText('Language').parentElement).toHaveTextContent('—');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the create form, and re-reads the catalogue after a change', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    m.catalogue = catalogue({ refetch });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /new template/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'close-template-form' }));
    await waitFor(() => expect(screen.queryByText('template-form')).not.toBeInTheDocument());
    m.onChanged?.();
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });

  it('tolerates the catalogue re-read failing after a change', async () => {
    const refetch = vi.fn().mockRejectedValue(new Error('offline'));
    m.catalogue = catalogue({ refetch });
    mount();
    await screen.findByTestId('row-diwali_tpl-en');
    m.onChanged?.();
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });

  it('lists buttons in the detail when the template has them', async () => {
    m.catalogue = catalogue({ templates: [template({ buttons: ['Track', 'Call'] })] });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'open-diwali_tpl-en' }));
    expect(await screen.findByText('Track, Call')).toBeInTheDocument();
  });

  it('deletes only after the operator confirms', async () => {
    const remove = m.drafts.removeTemplate as ReturnType<typeof vi.fn>;
    m.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mount();
    const row = await screen.findByTestId('row-diwali_tpl-en');
    fireEvent.click(within(row).getByRole('button', { name: /delete/i }));
    await waitFor(() => expect(m.confirm).toHaveBeenCalledTimes(1));
    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(within(row).getByRole('button', { name: /delete/i }));
    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'tpl-1' }))
    );
    expect(m.confirm.mock.calls[1][0]).toMatchObject({ destructive: true });
  });

  it('cannot delete a template AiSensy gave no id for', async () => {
    m.catalogue = catalogue({ templates: [template({ id: '' })] });
    mount();
    const row = await screen.findByTestId('row-diwali_tpl-en');
    expect(within(row).getByRole('button', { name: /delete/i })).toBeDisabled();
  });

  it('opens the create form, and shows the credentials note when not configured', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /new template/i }));
    expect(await screen.findByText('template-form')).toBeInTheDocument();
  });

  it('asks for Project credentials when AiSensy is not configured', async () => {
    m.catalogue = catalogue({ configured: false });
    mount();
    expect(await screen.findByText(/Environment Variables/)).toBeInTheDocument();
  });

  it('shows the section states: loading, empty and refused', async () => {
    m.catalogue = catalogue({ templates: [], loading: true });
    const loading = renderWithProviders(<AisensyTemplates onOpenLogs={vi.fn()} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    loading.unmount();

    m.catalogue = catalogue({ templates: [] });
    const empty = renderWithProviders(<AisensyTemplates onOpenLogs={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    empty.unmount();

    m.catalogue = catalogue({ error: new Error('Project API said no') });
    renderWithProviders(<AisensyTemplates onOpenLogs={vi.fn()} />);
    expect(await screen.findByText('Project API said no')).toBeInTheDocument();
  });
});
