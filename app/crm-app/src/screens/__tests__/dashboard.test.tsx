import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { CrmAppDashboardDocument } from '@/graphql/dashboard';
import { CrmAppLeadOptionsDocument } from '@/graphql/leadEditor';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { DashboardScreen } from '../dashboard/DashboardScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

const request = gqlRequest as jest.Mock;
const today = new Date().toISOString();
const lastYear = new Date(new Date().getFullYear() - 1, 5, 1).toISOString();

const OPTIONS = {
  crmLeadConfig: {
    venue_types: [],
    venue_lead_statuses: ['New', 'Won'],
    host_lead_statuses: ['New', 'Contacted'],
    priorities: ['High', 'Low'],
  },
  categories: [
    { id: 'c1', name: 'Sports', is_active: true },
    { id: 'c2', name: 'Retired', is_active: false },
  ],
};
const LEADS = {
  venueLeads: [
    {
      id: 'v1',
      lead_status: 'Won',
      priority: 'High',
      created_at: today,
      super_category_id: 'c1',
      super_category: { name: 'Sports' },
      services_offered: [{ service: 'DJ', custom_name: null }],
    },
    {
      id: 'v2',
      lead_status: 'New',
      priority: 'Low',
      created_at: lastYear,
      super_category_id: null,
      super_category: null,
      services_offered: [],
    },
  ],
  hostLeads: [
    {
      id: 'h1',
      lead_status: 'Contacted',
      priority: 'High',
      created_at: today,
      super_category_id: 'c1',
      super_category: { name: 'Sports' },
      services_offered: [{ service: 'DJ', custom_name: null }],
    },
  ],
};

const serve = (leads: unknown = LEADS) =>
  request.mockImplementation(async (doc: unknown) => {
    if (doc === CrmAppLeadOptionsDocument) return OPTIONS;
    if (doc === CrmAppDashboardDocument) {
      if (leads instanceof Error) throw leads;
      return leads;
    }
    throw new Error('unexpected operation');
  });

beforeEach(() => {
  jest.clearAllMocks();
  serve();
});

describe('DashboardScreen', () => {
  it('shows this month’s KPIs, counted as the portal counts them', async () => {
    renderWithTheme(<DashboardScreen />);
    expect(await screen.findByTestId('kpi-venue')).toHaveProp('aria-label', 'Venue Leads: 1');
    expect(screen.getByTestId('kpi-host')).toHaveProp('aria-label', 'Host Leads: 1');
    expect(screen.getByTestId('kpi-total')).toHaveProp('aria-label', 'Total Leads: 2');
    expect(screen.getByTestId('kpi-won')).toHaveProp('aria-label', 'Won %: 50%');
    expect(screen.getByTestId('kpi-services')).toHaveProp('aria-label', 'Services Offered: 1');
    expect(screen.getByLabelText('Contacted: 0 venue, 1 host')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sports: 1 venue, 1 host')).toBeOnTheScreen();
    expect(screen.getByLabelText('DJ: 2')).toBeOnTheScreen();
  });

  it('counts last year’s lead only under All time, and files it as Uncategorised', async () => {
    renderWithTheme(<DashboardScreen />);
    await screen.findByTestId('kpi-total');
    fireEvent.press(screen.getByTestId('dashboard-range-all'));
    await waitFor(() =>
      expect(screen.getByTestId('kpi-total')).toHaveProp('aria-label', 'Total Leads: 3'),
    );
    expect(screen.getByLabelText('Uncategorised: 1 venue, 0 host')).toBeOnTheScreen();
  });

  it('narrows to a custom From–To range, and keeps the range when a pick is cancelled', async () => {
    const open = DateTimePickerAndroid.open as jest.Mock;
    const lastYearDay = new Date(lastYear);
    renderWithTheme(<DashboardScreen />);
    await screen.findByTestId('kpi-total');
    fireEvent.press(screen.getByTestId('dashboard-range-custom'));
    // Both ends open: every lead counts.
    await waitFor(() =>
      expect(screen.getByTestId('kpi-total')).toHaveProp('aria-label', 'Total Leads: 3'),
    );
    open.mockImplementationOnce(({ onChange }) => onChange({ type: 'set' }, lastYearDay));
    fireEvent.press(screen.getByTestId('dashboard-to'));
    // Up to last year's day: only last year's lead.
    await waitFor(() =>
      expect(screen.getByTestId('kpi-total')).toHaveProp('aria-label', 'Total Leads: 1'),
    );
    expect(open.mock.calls.at(-1)?.[0]).toMatchObject({ mode: 'date' });
    open.mockImplementationOnce(({ onChange }) => onChange({ type: 'dismissed' }));
    fireEvent.press(screen.getByTestId('dashboard-from'));
    expect(screen.getByTestId('kpi-total')).toHaveProp('aria-label', 'Total Leads: 1');
  });

  it('says when a range holds no leads', async () => {
    serve({ venueLeads: [], hostLeads: [] });
    renderWithTheme(<DashboardScreen />);
    expect(await screen.findByTestId('kpi-total')).toHaveProp('aria-label', 'Total Leads: 0');
    expect(screen.getAllByText('No leads in this range.').length).toBeGreaterThan(0);
  });

  it('shows why it could not load, and retries', async () => {
    serve(new Error('offline'));
    renderWithTheme(<DashboardScreen />);
    expect(await screen.findByText('offline')).toBeOnTheScreen();
    serve();
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(await screen.findByTestId('kpi-total')).toBeOnTheScreen();
  });
});
