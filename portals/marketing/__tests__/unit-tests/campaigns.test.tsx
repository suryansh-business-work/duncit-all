import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const tableMock = vi.hoisted(() => ({ rows: [] as any[] }));
vi.mock('@duncit/table', () => ({
  useApolloTableFetch: () => vi.fn(),
  dateColumn: (opts: any = {}) => ({ field: opts.field ?? 'created_at', headerName: opts.headerName ?? 'Date', ...opts }),
  DuncitTable: ({ columns, refetchRef }: any) => {
    if (refetchRef) refetchRef.current = vi.fn();
    return (
      <div data-testid="duncit-table">
        {tableMock.rows.map((row, ri) => (
          <div key={ri} data-testid="table-row">
            {columns.map((c: any, ci: number) => (
              <span key={ci}>
                {c.valueGetter ? String(c.valueGetter(row)) : ''}
                {c.cellRenderer ? c.cellRenderer(row) : null}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: any) => (
    <textarea aria-label="mjml-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ dateFormat: 'dd/MM/yyyy', timeFormat: 'HH:mm' }),
}));

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label, value, onChange }: any) => (
    <input
      aria-label={label}
      value={value ? value.toISOString() : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  ),
}));

const dialogsMock = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', () => ({
  notifyError: dialogsMock.notifyError,
  notifySuccess: dialogsMock.notifySuccess,
}));

const apolloMock = vi.hoisted(() => ({
  queryData: {} as Record<string, any>,
  lazyFn: vi.fn(),
  lazyData: undefined as any,
  lazyLoading: false,
  mutations: {} as Record<string, any>,
}));
const opName = (doc: any) =>
  doc?.definitions?.find((d: any) => d.kind === 'OperationDefinition')?.name?.value ?? '';
vi.mock('@apollo/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client')>();
  return {
    ...actual,
    useApolloClient: () => ({}),
    useQuery: (doc: any) => ({ data: apolloMock.queryData[opName(doc)], loading: false, error: undefined }),
    useLazyQuery: () => [apolloMock.lazyFn, { data: apolloMock.lazyData, loading: apolloMock.lazyLoading }],
    useMutation: (doc: any) => {
      const name = opName(doc);
      apolloMock.mutations[name] ??= vi.fn().mockResolvedValue({ data: {} });
      return [apolloMock.mutations[name], { loading: false }];
    },
  };
});

import CampaignPreview from '../../src/pages/marketing-campaigns-page/CampaignPreview';
import CampaignTable from '../../src/pages/marketing-campaigns-page/CampaignTable';
import CampaignMjmlEditor from '../../src/pages/marketing-campaigns-page/marketing-campaign-form/CampaignMjmlEditor';
import MarketingCampaignForm from '../../src/pages/marketing-campaigns-page/marketing-campaign-form';
import MarketingCampaignsPage from '../../src/pages/marketing-campaigns-page/MarketingCampaignsPage';
import { blankMarketingCampaignValues } from '../../src/pages/marketing-campaigns-page/marketing-campaign-form';
import type { MarketingCampaignRow } from '../../src/pages/marketing-campaigns-page/queries';

beforeEach(() => {
  tableMock.rows = [];
  apolloMock.queryData = {};
  apolloMock.lazyData = undefined;
  apolloMock.lazyLoading = false;
  apolloMock.lazyFn = vi.fn();
  apolloMock.mutations = {};
});
afterEach(() => vi.clearAllMocks());

// ===========================================================================
describe('CampaignPreview', () => {
  it('renders the placeholder subject and warning errors', () => {
    render(<CampaignPreview html="" errors={['bad tag']} loading={false} />);
    expect(screen.getByText('Subject preview')).toBeInTheDocument();
    expect(screen.getByText('bad tag')).toBeInTheDocument();
  });

  it('renders the subject and a loading spinner', () => {
    render(<CampaignPreview html="<b>hi</b>" errors={[]} loading subject="Launch" />);
    expect(screen.getByText('Launch')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('CampaignTable', () => {
  const row: MarketingCampaignRow = {
    campaign_id: 'c1',
    name: 'Weekend',
    channel: 'EMAIL',
    audience: 'ALL_USERS',
    subject: 'Subject',
    scheduled_at: null,
    sent_at: null,
    status: 'DRAFT',
    recipient_count: 3,
    error: null,
    created_at: '2026-01-01T00:00:00.000Z',
    card: { title: 'Pod card' },
  };

  it('renders channel/status/card cells and sends a draft campaign', () => {
    const onSend = vi.fn();
    tableMock.rows = [
      { ...row, error: 'Delivery failed' },
      { ...row, campaign_id: 'c2', channel: 'WHATSAPP', status: 'SENT', card: null },
      { ...row, campaign_id: 'c3', channel: 'SMS' as any, audience: 'NEWSLETTER_SUBSCRIBERS', status: 'SENDING' },
    ];
    render(<CampaignTable fetchRows={vi.fn() as any} refetchRef={{ current: null } as any} sending={false} onSend={onSend} />);
    expect(screen.getByText('Delivery failed')).toBeInTheDocument();
    expect(screen.getAllByText('WhatsApp Email Fallback').length).toBeGreaterThan(0);
    // first (DRAFT) row's Send button is enabled
    const sendButtons = screen.getAllByRole('button', { name: 'Send' });
    fireEvent.click(sendButtons[0]);
    expect(onSend).toHaveBeenCalledWith('c1');
    // SENT / SENDING rows are disabled
    expect(sendButtons[1]).toBeDisabled();
    expect(sendButtons[2]).toBeDisabled();
  });

  it('disables all sends while a send is in flight', () => {
    tableMock.rows = [row];
    render(<CampaignTable fetchRows={vi.fn() as any} refetchRef={{ current: null } as any} sending onSend={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});

// ===========================================================================
describe('CampaignMjmlEditor', () => {
  it('formats, verifies and edits the MJML', () => {
    const onChange = vi.fn();
    const onVerify = vi.fn();
    apolloMock.mutations.AiCreateOrUpdateMjml = vi.fn().mockResolvedValue({ data: {} });
    render(
      <CampaignMjmlEditor value="<mjml></mjml>" error={false} helperText="ok" onChange={onChange} onVerify={onVerify} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    expect(onChange).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(onVerify).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('mjml-editor'), { target: { value: '<mjml>new</mjml>' } });
    expect(onChange).toHaveBeenCalledWith('<mjml>new</mjml>');
  });

  it('shows the error border state', () => {
    render(<CampaignMjmlEditor value="" error helperText="bad" onChange={vi.fn()} onVerify={vi.fn()} />);
    expect(screen.getByText('bad')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('MarketingCampaignForm', () => {
  const baseProps = {
    cards: [{ id: 'p1', type: 'POD' as const, title: 'Pod One' }],
    busy: false,
    previewLoading: false,
    errorMessage: null as string | null,
    onValuesChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('submits a valid campaign and reports value changes', async () => {
    const onSubmit = vi.fn();
    const onValuesChange = vi.fn();
    render(
      <MarketingCampaignForm
        {...baseProps}
        initialValues={blankMarketingCampaignValues('EMAIL')}
        onSubmit={onSubmit}
        onValuesChange={onValuesChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Campaign name'), { target: { value: 'Weekend launch' } });
    fireEvent.change(screen.getByLabelText('Email subject'), { target: { value: 'Pods live' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Now' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onValuesChange).toHaveBeenCalled();
  });

  it('shows the WhatsApp fallback alert and the error message', () => {
    render(
      <MarketingCampaignForm
        {...baseProps}
        initialValues={{ ...blankMarketingCampaignValues('WHATSAPP') }}
        errorMessage="Save failed"
      />,
    );
    expect(screen.getByText(/WhatsApp campaigns currently use/)).toBeInTheDocument();
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('switches the submit label to Schedule when a schedule is set', () => {
    render(
      <MarketingCampaignForm
        {...baseProps}
        initialValues={{ ...blankMarketingCampaignValues('EMAIL'), scheduled_at: '2030-01-01T00:00:00.000Z' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Schedule Campaign' })).toBeInTheDocument();
  });

  it('clears the card ref when the card type changes', () => {
    render(
      <MarketingCampaignForm
        {...baseProps}
        initialValues={{ ...blankMarketingCampaignValues('EMAIL'), card_type: 'POD', card_ref_id: 'p1' }}
      />,
    );
    const cardType = screen.getByLabelText('Dynamic card');
    fireEvent.mouseDown(cardType);
    fireEvent.click(screen.getByRole('option', { name: 'Club card' }));
    // card item select is present and enabled after a type is chosen
    expect(screen.getByLabelText('Card item')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('MarketingCampaignsPage', () => {
  it('renders the form + preview + history and schedules a preview render', async () => {
    vi.useFakeTimers();
    try {
      apolloMock.queryData = {
        MarketingCampaignPreviewCards: { marketingCampaignPreviewCards: [{ id: 'p1', title: 'Pod', type: 'POD' }] },
      };
      apolloMock.lazyData = { renderMarketingCampaign: { html: '<b>x</b>', errors: [], subject: 'S' } };
      render(<MarketingCampaignsPage defaultChannel="EMAIL" />);
      act(() => {
        fireEvent.change(screen.getByLabelText('Email subject'), { target: { value: 'A subject line' } });
      });
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(apolloMock.lazyFn).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('creates a campaign and shows a success toast', async () => {
    apolloMock.mutations.CreateMarketingCampaign = vi
      .fn()
      .mockResolvedValue({ data: { createMarketingCampaign: { error: null } } });
    render(<MarketingCampaignsPage defaultChannel="EMAIL" />);
    fireEvent.change(screen.getByLabelText('Campaign name'), { target: { value: 'Weekend launch' } });
    fireEvent.change(screen.getByLabelText('Email subject'), { target: { value: 'Pods live' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Now' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Campaign sent'));
  });

  it('surfaces a server-side campaign error via notifyError', async () => {
    apolloMock.mutations.CreateMarketingCampaign = vi
      .fn()
      .mockResolvedValue({ data: { createMarketingCampaign: { error: 'Bad MJML' } } });
    render(<MarketingCampaignsPage defaultChannel="EMAIL" />);
    fireEvent.change(screen.getByLabelText('Campaign name'), { target: { value: 'Weekend launch' } });
    fireEvent.change(screen.getByLabelText('Email subject'), { target: { value: 'Pods live' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Now' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith('Bad MJML'));
  });

  it('shows a form error when the create mutation throws', async () => {
    apolloMock.mutations.CreateMarketingCampaign = vi.fn().mockRejectedValue(new Error('Network down'));
    render(<MarketingCampaignsPage defaultChannel="EMAIL" />);
    fireEvent.change(screen.getByLabelText('Campaign name'), { target: { value: 'Weekend launch' } });
    fireEvent.change(screen.getByLabelText('Email subject'), { target: { value: 'Pods live' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Now' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument());
  });

  it('sends an existing campaign from the history table', async () => {
    apolloMock.mutations.SendMarketingCampaign = vi
      .fn()
      .mockResolvedValue({ data: { sendMarketingCampaign: { error: null } } });
    tableMock.rows = [
      {
        campaign_id: 'c9',
        name: 'Past',
        channel: 'EMAIL',
        audience: 'ALL_USERS',
        subject: 'S',
        status: 'DRAFT',
        recipient_count: 0,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ];
    render(<MarketingCampaignsPage defaultChannel="EMAIL" />);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Campaign sent'));
  });
});
