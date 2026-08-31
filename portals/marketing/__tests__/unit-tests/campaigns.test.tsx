import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import {
  campaignVariablesMock,
  createCampaignMock,
  makeRender,
  renderCampaignMock,
  audienceListsFeedMock,
} from '../mocks';
import { __setTableRows } from './table-mock';

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
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    formatDateTime: (d: Date | string) => `fmt:${String(d)}`,
  }),
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
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: dialogsMock.notifyError,
  notifySuccess: dialogsMock.notifySuccess,
}));

import CampaignPreview from '../../src/pages/marketing-campaigns-page/CampaignPreview';
import CampaignMjmlEditor from '../../src/pages/marketing-campaigns-page/marketing-campaign-form/CampaignMjmlEditor';
import MarketingCampaignForm, {
  blankMarketingCampaignValues,
  toMarketingCampaignInput,
} from '../../src/pages/marketing-campaigns-page/marketing-campaign-form';
import CreateCampaignPage from '../../src/pages/marketing-campaigns-page/CreateCampaignPage';
import { AUDIENCE_LISTS_FOR_CAMPAIGN } from '../../src/pages/marketing-campaigns-page/queries';

/** Mocks fired on mount of the create page (audience lists + preview render). */
const pageBaseMocks = () => [
  renderCampaignMock(),
  campaignVariablesMock(),
  audienceListsFeedMock(AUDIENCE_LISTS_FOR_CAMPAIGN),
];

/** The create page mounted behind its real route, so navigating away on save
 * lands somewhere observable. */
const renderCreatePage = (mocks = pageBaseMocks()) =>
  renderWithProviders(<CreateCampaignPage />, {
    mocks,
    initialEntries: ['/campaigns/email/new'],
    routes: (
      <>
        <Route path="/campaigns/email/new" element={<CreateCampaignPage />} />
        <Route path="/campaigns/email" element={<div>campaigns-list</div>} />
      </>
    ),
  });

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
    expect(screen.getByTitle('Campaign preview')).toHaveAttribute(
      'srcdoc',
      expect.stringContaining('Preview will appear here.'),
    );
  });

  it('renders the subject and a loading spinner', () => {
    renderWithProviders(<CampaignPreview html="<b>hi</b>" errors={[]} loading subject="Launch" />);
    expect(screen.getByText('Launch')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByTitle('Campaign preview')).toHaveAttribute('srcdoc', '<b>hi</b>');
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
    variables: [{ name: 'app_name', description: 'Your app name.', sample: 'Duncit' }],
    unknownVariables: [] as string[],
    audienceLists: [
      { id: 'a1', name: 'Pune regulars', member_count: 1284 },
      { id: 'a2', name: 'Dormant', member_count: 0 },
      { id: 'a3', name: 'The one', member_count: 1 },
    ],
    busy: false,
    previewLoading: false,
    errorMessage: null as string | null,
    onValuesChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  describe('the saved-list audience', () => {
    const listValues = () => ({
      ...blankMarketingCampaignValues('EMAIL'),
      audience: 'AUDIENCE_LIST' as const,
      name: 'Diwali',
      subject: 'Festive offers',
    });

    it('shows no reach for an audience that has no count of its own', () => {
      renderWithProviders(
        <MarketingCampaignForm {...baseProps} initialValues={blankMarketingCampaignValues('EMAIL')} />,
      );
      expect(screen.queryByTestId('campaign-reach')).not.toBeInTheDocument();
    });

    it('offers each list with its live size and reports the reach', async () => {
      renderWithProviders(<MarketingCampaignForm {...baseProps} initialValues={listValues()} />);
      fireEvent.mouseDown(screen.getByLabelText(/Audience list/));
      fireEvent.click(await screen.findByText('Pune regulars · 1,284'));
      expect(await screen.findByTestId('campaign-reach')).toHaveTextContent('reaches 1,284 people');
    });

    it('says one person, not one people', async () => {
      renderWithProviders(<MarketingCampaignForm {...baseProps} initialValues={listValues()} />);
      fireEvent.mouseDown(screen.getByLabelText(/Audience list/));
      fireEvent.click(await screen.findByText('The one · 1'));
      expect(await screen.findByTestId('campaign-reach')).toHaveTextContent('reaches 1 person');
    });

    it('warns when the picked list reaches nobody', async () => {
      renderWithProviders(<MarketingCampaignForm {...baseProps} initialValues={listValues()} />);
      fireEvent.mouseDown(screen.getByLabelText(/Audience list/));
      fireEvent.click(await screen.findByText('Dormant · 0'));
      expect(await screen.findByTestId('campaign-reach')).toHaveTextContent('reaches nobody');
    });

    it('points at Target Audience when there are no lists yet', async () => {
      renderWithProviders(
        <MarketingCampaignForm {...baseProps} audienceLists={[]} initialValues={listValues()} />,
      );
      fireEvent.mouseDown(screen.getByLabelText(/Audience list/));
      expect(await screen.findByText(/create one under Target Audience/)).toBeInTheDocument();
    });

    it('sends the picked list id, and omits it for other audiences', () => {
      expect(
        toMarketingCampaignInput({ ...listValues(), audience_list_id: 'a1' }).audience_list_id,
      ).toBe('a1');
      // A list id left over from switching audience must not be sent.
      expect(
        toMarketingCampaignInput({
          ...listValues(),
          audience: 'ALL_USERS',
          audience_list_id: 'a1',
        }).audience_list_id,
      ).toBeUndefined();
    });
  });

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

  it('shows the error message it is given', () => {
    renderWithProviders(
      <MarketingCampaignForm
        {...baseProps}
        initialValues={{ ...blankMarketingCampaignValues('EMAIL') }}
        errorMessage="Save failed"
      />,
    );
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  // The card picker is gone: a campaign is its MJML, nothing else to attach.
  it('offers no dynamic-card fields', () => {
    renderWithProviders(
      <MarketingCampaignForm {...baseProps} initialValues={blankMarketingCampaignValues('EMAIL')} />,
    );
    expect(screen.queryByLabelText('Dynamic card')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Card item')).not.toBeInTheDocument();
  });

  it('lists the variables you are allowed to write', () => {
    renderWithProviders(
      <MarketingCampaignForm {...baseProps} initialValues={blankMarketingCampaignValues('EMAIL')} />,
    );
    expect(screen.getByText('{{app_name}}')).toBeInTheDocument();
    expect(screen.queryByTestId('unknown-variables')).not.toBeInTheDocument();
  });

  it('names a placeholder the renderer will not substitute', () => {
    renderWithProviders(
      <MarketingCampaignForm
        {...baseProps}
        unknownVariables={['first_name']}
        initialValues={blankMarketingCampaignValues('EMAIL')}
      />,
    );
    expect(screen.getByTestId('unknown-variables')).toHaveTextContent(
      '{{first_name}} — not a known variable',
    );
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
});

// ===========================================================================
describe('CreateCampaignPage', () => {
  // The whole point of the split layout: type MJML, watch it render — with no
  // subject line typed yet.
  it('renders the preview from the MJML alone, before a subject is written', async () => {
    renderCreatePage();
    fireEvent.change(screen.getByLabelText('mjml-editor'), {
      target: { value: '<mjml><mj-body>hello there friend</mj-body></mjml>' },
    });
    await waitFor(() => expect(screen.getByText('S')).toBeInTheDocument(), { timeout: 2500 });
  });

  it('does not ask the server to render an empty editor', async () => {
    renderCreatePage([campaignVariablesMock(), audienceListsFeedMock(AUDIENCE_LISTS_FOR_CAMPAIGN)]);
    fireEvent.change(screen.getByLabelText('mjml-editor'), { target: { value: '   ' } });
    // No render mock is provided, so an attempted render would surface an error.
    await waitFor(() => expect(screen.getByTitle('Campaign preview')).toBeInTheDocument());
    expect(screen.getByText('Subject preview')).toBeInTheDocument();
  });

  it('schedules a campaign, toasts, and returns to the list', async () => {
    renderCreatePage([...pageBaseMocks(), createCampaignMock()]);
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
    expect(await screen.findByText('campaigns-list')).toBeInTheDocument();
  });

  it('creates a campaign and shows a success toast', async () => {
    renderCreatePage([...pageBaseMocks(), createCampaignMock()]);
    fireEvent.change(screen.getByLabelText(/^Campaign name/), { target: { value: 'Weekend launch' } });
    fireEvent.change(screen.getByLabelText(/^Email subject/), { target: { value: 'Pods live' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Now' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Campaign sent'));
  });

  // The campaign was saved but did not go out: say so, and still move on.
  it('surfaces a server-side campaign error via notifyError', async () => {
    renderCreatePage([...pageBaseMocks(), createCampaignMock({ serverError: 'Bad MJML' })]);
    fireEvent.change(screen.getByLabelText(/^Campaign name/), { target: { value: 'Weekend launch' } });
    fireEvent.change(screen.getByLabelText(/^Email subject/), { target: { value: 'Pods live' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Now' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith('Bad MJML'));
  });

  // A rejected save keeps you on the form with your draft intact.
  it('shows a form error when the create mutation throws', async () => {
    renderCreatePage([...pageBaseMocks(), createCampaignMock({ throwMessage: 'Network down' })]);
    fireEvent.change(screen.getByLabelText(/^Campaign name/), { target: { value: 'Weekend launch' } });
    fireEvent.change(screen.getByLabelText(/^Email subject/), { target: { value: 'Pods live' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Now' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument());
    expect(screen.queryByText('campaigns-list')).not.toBeInTheDocument();
  });

  // An untouched draft is not work — leave straight away.
  it('goes back without asking when nothing has been written', async () => {
    renderCreatePage();
    fireEvent.click(screen.getByRole('button', { name: 'Campaigns' }));
    expect(await screen.findByText('campaigns-list')).toBeInTheDocument();
  });

  it('asks before throwing away a draft, and stays when you cancel', async () => {
    renderCreatePage();
    fireEvent.change(screen.getByLabelText(/^Campaign name/), { target: { value: 'Half written' } });
    fireEvent.click(screen.getByRole('button', { name: 'Campaigns' }));

    expect(await screen.findByText('Leave without sending?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Leave without sending?')).not.toBeInTheDocument(),
    );
    expect(screen.queryByText('campaigns-list')).not.toBeInTheDocument();
  });

  it('leaves once you confirm the draft can go', async () => {
    renderCreatePage();
    fireEvent.change(screen.getByLabelText(/^Campaign name/), { target: { value: 'Half written' } });
    fireEvent.click(screen.getByRole('button', { name: 'Campaigns' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard draft' }));
    expect(await screen.findByText('campaigns-list')).toBeInTheDocument();
  });

  it('warns about a placeholder the renderer does not know', async () => {
    renderCreatePage([
      renderCampaignMock(makeRender({ detected_variables: ['app_name', 'first_name'] })),
      campaignVariablesMock(),
      audienceListsFeedMock(AUDIENCE_LISTS_FOR_CAMPAIGN),
    ]);
    fireEvent.change(screen.getByLabelText('mjml-editor'), {
      target: { value: '<mjml><mj-body>Hi {{first_name}} from {{app_name}}</mj-body></mjml>' },
    });
    expect(await screen.findByTestId('unknown-variables')).toHaveTextContent('{{first_name}}');
  });
});
