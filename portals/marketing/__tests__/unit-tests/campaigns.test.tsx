import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  clubCardsMock,
  createCampaignMock,
  makeCampaignRow,
  makePreviewCard,
  podCardsMock,
  renderCampaignMock,
  sendCampaignMock,
} from '../mocks';
import { __setTableRows, fetchRowsFrom } from './table-mock';

// ---------------------------------------------------------------------------
// Module mocks — shared table, monaco editor, app-settings + MUI X picker, and
// the toast host. GraphQL flows through the real Apollo `MockedProvider`.
// ---------------------------------------------------------------------------
vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v?: string) => void }) => (
    <div>
      <textarea aria-label="mjml-editor" value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => onChange(undefined)}>
        editor-clear
      </button>
    </div>
  ),
}));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ dateFormat: 'dd/MM/yyyy', timeFormat: 'HH:mm' }),
}));
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({
    label,
    value,
    onChange,
    slotProps,
  }: {
    label: string;
    value: Date | null;
    onChange: (d: Date | null) => void;
    slotProps?: { textField?: { helperText?: string } };
  }) => (
    <div>
      <input
        aria-label={label}
        value={value ? value.toISOString() : ''}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
      />
      <span>{slotProps?.textField?.helperText}</span>
    </div>
  ),
}));
const dialogsMock = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', () => ({
  notifyError: dialogsMock.notifyError,
  notifySuccess: dialogsMock.notifySuccess,
}));

import CampaignPreview from '../../src/pages/marketing-campaigns-page/CampaignPreview';
import CampaignTable from '../../src/pages/marketing-campaigns-page/CampaignTable';
import CampaignMjmlEditor from '../../src/pages/marketing-campaigns-page/marketing-campaign-form/CampaignMjmlEditor';
import MarketingCampaignForm, {
  blankMarketingCampaignValues,
} from '../../src/pages/marketing-campaigns-page/marketing-campaign-form';
import MarketingCampaignsPage from '../../src/pages/marketing-campaigns-page/MarketingCampaignsPage';
import type { MarketingCampaignRow } from '../../src/pages/marketing-campaigns-page/queries';

/** Mocks fired on mount of the campaigns page (preview cards + render). */
const pageBaseMocks = () => [podCardsMock(), clubCardsMock(), renderCampaignMock()];

beforeEach(() => {
  __setTableRows([]);
});
afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
describe('CampaignPreview', () => {
  it('renders the placeholder subject and warning errors', () => {
    renderWithProviders(<CampaignPreview html="" errors={['bad tag']} loading={false} />);
    expect(screen.getByText('Subject preview')).toBeInTheDocument();
    expect(screen.getByText('bad tag')).toBeInTheDocument();
  });

  it('renders the subject and a loading spinner', () => {
    renderWithProviders(<CampaignPreview html="<b>hi</b>" errors={[]} loading subject="Launch" />);
    expect(screen.getByText('Launch')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('CampaignTable', () => {
  it('renders channel/status/card cells and sends a draft campaign', async () => {
    const onSend = vi.fn();
    const rows = [
      makeCampaignRow({ error: 'Delivery failed' }),
      makeCampaignRow({ campaign_id: 'c2', channel: 'WHATSAPP', status: 'SENT', card: null }),
      makeCampaignRow({
        campaign_id: 'c3',
        channel: 'SMS' as MarketingCampaignRow['channel'],
        audience: 'PARTNERS',
        status: 'SENDING',
      }),
    ];
    renderWithProviders(
      <CampaignTable
        fetchRows={fetchRowsFrom(rows)}
        refetchRef={{ current: null }}
        sending={false}
        onSend={onSend}
      />,
    );
    expect(await screen.findByText('Delivery failed')).toBeInTheDocument();
    expect(screen.getAllByText('WhatsApp Email Fallback').length).toBeGreaterThan(0);
    const sendButtons = screen.getAllByRole('button', { name: 'Send' });
    fireEvent.click(sendButtons[0]);
    expect(onSend).toHaveBeenCalledWith('c1');
    expect(sendButtons[1]).toBeDisabled();
    expect(sendButtons[2]).toBeDisabled();
  });

  it('disables all sends while a send is in flight', async () => {
    renderWithProviders(
      <CampaignTable
        fetchRows={fetchRowsFrom([makeCampaignRow()])}
        refetchRef={{ current: null }}
        sending
        onSend={vi.fn()}
      />,
    );
    expect(await screen.findByRole('button', { name: 'Send' })).toBeDisabled();
  });
});

// ===========================================================================
describe('CampaignMjmlEditor', () => {
  it('formats, verifies and edits the MJML', () => {
    const onChange = vi.fn();
    const onVerify = vi.fn();
    renderWithProviders(
      <CampaignMjmlEditor
        value="<mjml></mjml>"
        error={false}
        helperText="ok"
        onChange={onChange}
        onVerify={onVerify}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    expect(onChange).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(onVerify).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('mjml-editor'), { target: { value: '<mjml>new</mjml>' } });
    expect(onChange).toHaveBeenCalledWith('<mjml>new</mjml>');
    // editor emits undefined -> component coerces to empty string
    fireEvent.click(screen.getByRole('button', { name: 'editor-clear' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('shows the error border state', () => {
    renderWithProviders(
      <CampaignMjmlEditor value="" error helperText="bad" onChange={vi.fn()} onVerify={vi.fn()} />,
    );
    expect(screen.getByText('bad')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('MarketingCampaignForm', () => {
  const baseProps = {
    cards: [makePreviewCard({ id: 'p1', type: 'POD' as const, title: 'Pod One' })],
    busy: false,
    previewLoading: false,
    errorMessage: null as string | null,
    onValuesChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('submits a valid campaign and reports value changes', async () => {
    const onSubmit = vi.fn();
    const onValuesChange = vi.fn();
    renderWithProviders(
      <MarketingCampaignForm
        {...baseProps}
        initialValues={blankMarketingCampaignValues('EMAIL')}
        onSubmit={onSubmit}
        onValuesChange={onValuesChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/^Campaign name/), { target: { value: 'Weekend launch' } });
    fireEvent.change(screen.getByLabelText(/^Email subject/), { target: { value: 'Pods live' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Now' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onValuesChange).toHaveBeenCalled();
  });

  it('shows the WhatsApp fallback alert and the error message', () => {
    renderWithProviders(
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
    renderWithProviders(
      <MarketingCampaignForm
        {...baseProps}
        initialValues={{
          ...blankMarketingCampaignValues('EMAIL'),
          scheduled_at: '2030-01-01T00:00:00.000Z',
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Schedule Campaign' })).toBeInTheDocument();
  });

  it('surfaces field validation messages for the schedule and MJML', async () => {
    const { container } = renderWithProviders(
      <MarketingCampaignForm
        {...baseProps}
        initialValues={{ ...blankMarketingCampaignValues('EMAIL'), mjml: 'short', scheduled_at: 'xyz' }}
      />,
    );
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(await screen.findByText(/MJML must be at least 20 characters/)).toBeInTheDocument();
    expect(screen.getByText(/Schedule must be a valid date and time/)).toBeInTheDocument();
  });

  it('clears the card ref when the card type changes', () => {
    renderWithProviders(
      <MarketingCampaignForm
        {...baseProps}
        initialValues={{ ...blankMarketingCampaignValues('EMAIL'), card_type: 'POD', card_ref_id: 'p1' }}
      />,
    );
    const cardType = screen.getByLabelText('Dynamic card');
    fireEvent.mouseDown(cardType);
    fireEvent.click(screen.getByRole('option', { name: 'Club card' }));
    expect(screen.getByLabelText('Card item')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('MarketingCampaignsPage', () => {
  it('renders the form + preview + history and schedules a preview render', async () => {
    renderWithProviders(<MarketingCampaignsPage defaultChannel="EMAIL" />, { mocks: pageBaseMocks() });
    fireEvent.change(screen.getByLabelText(/^Email subject/), { target: { value: 'A subject line' } });
    // The debounced lazy render resolves and its subject reaches the preview.
    await waitFor(() => expect(screen.getByText('S')).toBeInTheDocument(), { timeout: 2500 });
  });

  it('resolves POD preview cards when data is loaded', async () => {
    renderWithProviders(<MarketingCampaignsPage defaultChannel="EMAIL" />, { mocks: pageBaseMocks() });
    fireEvent.mouseDown(screen.getByLabelText('Dynamic card'));
    fireEvent.click(screen.getByRole('option', { name: 'Pod card' }));
    fireEvent.mouseDown(screen.getByLabelText('Card item'));
    expect(await screen.findByRole('option', { name: 'Pod One' })).toBeInTheDocument();
  });

  it('resolves CLUB preview cards when data is loaded', async () => {
    renderWithProviders(<MarketingCampaignsPage defaultChannel="EMAIL" />, { mocks: pageBaseMocks() });
    fireEvent.mouseDown(screen.getByLabelText('Dynamic card'));
    fireEvent.click(screen.getByRole('option', { name: 'Club card' }));
    fireEvent.mouseDown(screen.getByLabelText('Card item'));
    expect(await screen.findByRole('option', { name: 'Club One' })).toBeInTheDocument();
  });

  it('falls back to empty POD cards when none are loaded', async () => {
    renderWithProviders(<MarketingCampaignsPage defaultChannel="EMAIL" />, {
      mocks: [podCardsMock([], { pending: true }), clubCardsMock([], { pending: true }), renderCampaignMock()],
    });
    await screen.findByTestId('table-empty');
    fireEvent.mouseDown(screen.getByLabelText('Dynamic card'));
    fireEvent.click(screen.getByRole('option', { name: 'Pod card' }));
    expect(screen.getByLabelText('Card item')).toBeInTheDocument();
  });

  it('falls back to empty CLUB cards when none are loaded', async () => {
    renderWithProviders(<MarketingCampaignsPage defaultChannel="EMAIL" />, {
      mocks: [podCardsMock([], { pending: true }), clubCardsMock([], { pending: true }), renderCampaignMock()],
    });
    await screen.findByTestId('table-empty');
    fireEvent.mouseDown(screen.getByLabelText('Dynamic card'));
    fireEvent.click(screen.getByRole('option', { name: 'Club card' }));
    expect(screen.getByLabelText('Card item')).toBeInTheDocument();
  });

  it('schedules a campaign and shows the scheduled toast', async () => {
    renderWithProviders(<MarketingCampaignsPage defaultChannel="EMAIL" />, {
      mocks: [...pageBaseMocks(), createCampaignMock()],
    });
    fireEvent.change(screen.getByLabelText(/^Campaign name/), { target: { value: 'Weekend launch' } });
    fireEvent.change(screen.getByLabelText(/^Email subject/), { target: { value: 'Pods live' } });
    fireEvent.change(screen.getByLabelText('Schedule at'), {
      target: { value: '2030-01-01T00:00:00.000Z' },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Schedule Campaign' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Schedule Campaign' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Campaign scheduled'));
  });

  it('creates a campaign and shows a success toast', async () => {
    renderWithProviders(<MarketingCampaignsPage defaultChannel="EMAIL" />, {
      mocks: [...pageBaseMocks(), createCampaignMock()],
    });
    fireEvent.change(screen.getByLabelText(/^Campaign name/), { target: { value: 'Weekend launch' } });
    fireEvent.change(screen.getByLabelText(/^Email subject/), { target: { value: 'Pods live' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Now' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Campaign sent'));
  });

  it('surfaces a server-side campaign error via notifyError', async () => {
    renderWithProviders(<MarketingCampaignsPage defaultChannel="EMAIL" />, {
      mocks: [...pageBaseMocks(), createCampaignMock({ serverError: 'Bad MJML' })],
    });
    fireEvent.change(screen.getByLabelText(/^Campaign name/), { target: { value: 'Weekend launch' } });
    fireEvent.change(screen.getByLabelText(/^Email subject/), { target: { value: 'Pods live' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Now' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith('Bad MJML'));
  });

  it('shows a form error when the create mutation throws', async () => {
    renderWithProviders(<MarketingCampaignsPage defaultChannel="EMAIL" />, {
      mocks: [...pageBaseMocks(), createCampaignMock({ throwMessage: 'Network down' })],
    });
    fireEvent.change(screen.getByLabelText(/^Campaign name/), { target: { value: 'Weekend launch' } });
    fireEvent.change(screen.getByLabelText(/^Email subject/), { target: { value: 'Pods live' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Now' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument());
  });

  it('sends an existing campaign from the history table', async () => {
    __setTableRows([makeCampaignRow({ campaign_id: 'c9', name: 'Past', recipient_count: 0 })]);
    renderWithProviders(<MarketingCampaignsPage defaultChannel="EMAIL" />, {
      mocks: [...pageBaseMocks(), sendCampaignMock()],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Send' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Campaign sent'));
  });

  it('reports a server-side send error and a thrown send error', async () => {
    __setTableRows([makeCampaignRow({ campaign_id: 'c9', name: 'Past', recipient_count: 0 })]);
    renderWithProviders(<MarketingCampaignsPage defaultChannel="EMAIL" />, {
      mocks: [
        ...pageBaseMocks(),
        sendCampaignMock({ serverError: 'Rejected' }),
        sendCampaignMock({ throwMessage: 'Send crashed' }),
      ],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Send' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith('Rejected'));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith('Send crashed'));
  });
});
