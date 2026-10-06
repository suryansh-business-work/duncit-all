import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { formatDate } from '@duncit/app-settings';
import VenueLeadDetailPage from '@/pages/venue-leads/VenueLeadDetailPage';
import { formatCapacity, joinList, leadDate } from '@/pages/venue-leads/VenueLeadDetailPage/helpers';
import { CRM_DYNAMIC_FIELDS, VENUE_LEAD } from '@/api/crm.gql';
import type { VenueLead } from '@/api/crm.types';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { venueLead } from '../fixtures/leads';

const leadMock = (lead: VenueLead | null): MockedResponse => ({
  request: { query: VENUE_LEAD, variables: { id: 'venue-1' } },
  // GraphQL answers an unset optional field with null, never by leaving it out.
  result: { data: { venueLead: lead && { matched_user: null, ...lead, venue_types: lead.venue_types ?? null } } },
  maxUsageCount: 5,
});

const dynamicFieldsMock: MockedResponse = {
  request: { query: CRM_DYNAMIC_FIELDS, variables: { entity: 'VENUE_LEAD', include_inactive: false } },
  result: { data: { crmDynamicFields: [] } },
};

const renderPage = (lead: VenueLead | null, extra: MockedResponse[] = []) =>
  renderWithApollo(<VenueLeadDetailPage />, [leadMock(lead), ...extra], {
    route: '/venue-leads/venue-1/view',
    path: '/venue-leads/:id/view',
  });

/** The value printed next to a LeadDetailRow label inside `scope`. */
const rowValue = (scope: HTMLElement, label: string) =>
  within(scope).getByText(label).nextElementSibling?.textContent;

const openTab = (value: string) => {
  fireEvent.click(screen.getByTestId(`lead-tab-${value}`));
  return screen.getByTestId(`lead-tabpanel-${value}`);
};

const heading = () => screen.findByRole('heading', { level: 1, name: 'Grand Hall' });

describe('VenueLeadDetailPage', () => {
  it('says so when the venue lead does not exist', async () => {
    renderPage(null);
    expect(await screen.findByText('Venue lead not found.')).toBeInTheDocument();
  });

  it('shows the commercial terms of a fully priced venue', async () => {
    renderPage(venueLead());
    await heading();

    const commercial = openTab('commercial');
    expect(within(commercial).getByRole('heading', { name: 'Commercial' })).toBeInTheDocument();
    expect(rowValue(commercial, 'Pricing models')).toBe('Per plate');
    expect(rowValue(commercial, 'Expected charges')).toBe('₹ 50000');
    expect(rowValue(commercial, 'Security deposit')).toBe('₹ 10000');
    expect(rowValue(commercial, 'GST')).toBe('Applicable');
    expect(rowValue(commercial, 'Invoice')).toBe('Available');
  });

  it('dashes missing commercial terms and says No to GST and invoice', async () => {
    renderPage(
      venueLead({
        pricing_models: [],
        expected_charges: null,
        security_deposit: null,
        gst_applicable: false,
        invoice_available: false,
      }),
    );
    await heading();

    const commercial = openTab('commercial');
    expect(rowValue(commercial, 'Pricing models')).toBe('—');
    expect(rowValue(commercial, 'Expected charges')).toBe('—');
    expect(rowValue(commercial, 'Security deposit')).toBe('—');
    expect(rowValue(commercial, 'GST')).toBe('No');
    expect(rowValue(commercial, 'Invoice')).toBe('No');
  });

  it('counts tagged services in the singular, the plural and the empty catalogue', async () => {
    const first = renderPage(venueLead());
    await heading();
    expect(screen.getByTestId('lead-tab-services')).toHaveTextContent('Services (1)');
    const one = openTab('services');
    expect(within(one).getByText('1 service tagged')).toBeInTheDocument();
    expect(within(one).getByText('Catering')).toBeInTheDocument();
    first.unmount();

    const second = renderPage(
      venueLead({
        services_offered: [
          { service: 'Catering', custom_name: null, description: null },
          { service: 'Decor', custom_name: null, description: null },
        ],
      }),
    );
    await heading();
    expect(within(openTab('services')).getByText('2 services tagged')).toBeInTheDocument();
    second.unmount();

    renderPage(venueLead({ services_offered: [] }));
    await heading();
    expect(screen.getByTestId('lead-tab-services')).toHaveTextContent('Services (0)');
    expect(
      within(openTab('services')).getByText('Catalogue managed via Manage Venue Services'),
    ).toBeInTheDocument();
  });

  it('lists the contacts, custom fields and manual logs of the lead', async () => {
    renderPage(venueLead(), [dynamicFieldsMock]);
    await heading();

    expect(screen.getByTestId('lead-tab-contacts')).toHaveTextContent('Contacts (1)');
    expect(within(openTab('contacts')).getByText('Meera Shah')).toBeInTheDocument();

    const custom = openTab('custom-fields');
    expect(within(custom).getByRole('heading', { name: 'Custom fields' })).toBeInTheDocument();
    expect(within(custom).getByText('Admin-defined fields from Settings → Dynamic Fields.')).toBeInTheDocument();
    expect(await within(custom).findByText(/No custom fields defined yet/)).toBeInTheDocument();

    expect(within(openTab('manual-logs')).getByRole('heading', { name: 'Manual logs' })).toBeInTheDocument();
  });

  it('shows the follow-up date, or a dash when none is scheduled', async () => {
    const first = renderPage(venueLead());
    await heading();
    expect(rowValue(screen.getByTestId('lead-tabpanel-overview'), 'Follow-up')).toBe(
      formatDate('2026-09-25T00:00:00.000Z'),
    );
    first.unmount();

    renderPage(venueLead({ next_follow_up_date: null }));
    await heading();
    expect(rowValue(screen.getByTestId('lead-tabpanel-overview'), 'Follow-up')).toBe('—');
  });

  it('shows two venue types in the hero and folds the rest into a "+N more" chip', async () => {
    renderPage(venueLead({ venue_types: ['Banquet', 'Lounge', 'Rooftop', 'Lawn'] }));
    await heading();

    expect(screen.getAllByText('Lounge').length).toBeGreaterThan(0);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(rowValue(screen.getByTestId('lead-tabpanel-overview'), 'Types')).toBe('Banquet, Lounge, Rooftop, Lawn');
  });

  it('renders no venue type chips when the server sends no venue types', async () => {
    renderPage(venueLead({ venue_types: undefined }));
    await heading();

    expect(screen.queryByText(/more$/)).toBeNull();
    expect(screen.queryByText('Banquet')).toBeNull();
    expect(rowValue(screen.getByTestId('lead-tabpanel-overview'), 'Types')).toBe('—');
  });

  it('shows the logo and the matched Duncit user, and hides the city, category and tag chips it lacks', async () => {
    const { container } = renderPage(
      venueLead({
        logo_url: 'https://cdn.duncit.com/venues/grand-hall.png',
        city: '',
        super_category: null,
        tags: [],
        matched_user: {
          user_id: 'user-9',
          full_name: 'Meera Shah',
          email: 'meera@grandhall.in',
          phone: null,
          profile_photo: null,
          matched_on: 'EMAIL',
        },
      }),
    );
    await heading();

    expect(container.querySelector('img[src="https://cdn.duncit.com/venues/grand-hall.png"]')).not.toBeNull();
    expect(screen.getAllByText('Also a Duncit user · Email match').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('venue-tags')).toBeNull();
    expect(screen.queryByText('#priority-city')).toBeNull();
    expect(screen.queryByText('Events')).toBeNull();
  });

  it('shows the city, category and hashtag chips of a tagged venue', async () => {
    renderPage(venueLead());
    await heading();

    expect(within(screen.getByTestId('venue-tags')).getByText('#priority-city')).toBeInTheDocument();
    expect(screen.getAllByText('Pune').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Events').length).toBeGreaterThan(0);
  });

  it('opens and closes the Ask AI drawer, then goes to the editor', async () => {
    renderPage(venueLead());
    await heading();

    expect(screen.queryByRole('complementary', { name: 'Ask AI' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ask AI' }));
    const drawer = await screen.findByRole('complementary', { name: 'Ask AI' });
    expect(drawer).toBeVisible();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Ask AI' })).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/venue-leads\/venue-1$/);
  });

  it('switches to the survey, website, reminders, linked hosts and communications tabs through the URL', async () => {
    renderPage(venueLead());
    await heading();

    expect(screen.getByTestId('lead-tab-linked-hosts')).toHaveTextContent('Linked Hosts (0)');
    for (const value of ['survey', 'website', 'reminders', 'linked-hosts', 'communications']) {
      expect(openTab(value)).toBeInTheDocument();
      expect(screen.getByTestId(`lead-tab-${value}`)).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('location')).toHaveTextContent(`tab=${value}`);
      expect(screen.queryByTestId('lead-tabpanel-overview')).toBeNull();
    }
  });

  it('goes back to the venue leads list', async () => {
    renderPage(venueLead());
    await heading();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Venue Leads' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/venue-leads$/);
  });
});

describe('venue lead detail helpers', () => {
  it('joins a list, and dashes an empty or missing one', () => {
    expect(joinList(['Weddings', 'Parties'])).toBe('Weddings, Parties');
    expect(joinList([])).toBe('—');
    expect(joinList(null)).toBe('—');
    expect(joinList(undefined)).toBe('—');
  });

  it('formats a lead date, and gives null when there is none', () => {
    expect(leadDate('2026-10-20T00:00:00.000Z')).toBe(formatDate('2026-10-20T00:00:00.000Z'));
    expect(leadDate('2026-10-20T00:00:00.000Z')).not.toBe('');
    expect(leadDate(null)).toBeNull();
    expect(leadDate(undefined)).toBeNull();
  });

  it('formats a capacity range, a single bound, or a dash when neither is known', () => {
    expect(formatCapacity(50, 300)).toBe('50 – 300');
    expect(formatCapacity(50, null)).toBe('50');
    expect(formatCapacity(undefined, 300)).toBe('300');
    expect(formatCapacity(0, 0)).toBe('0 – 0');
    expect(formatCapacity(null, null)).toBe('—');
    expect(formatCapacity()).toBe('—');
  });
});
