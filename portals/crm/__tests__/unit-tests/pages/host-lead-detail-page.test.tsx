import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { formatDate, formatDateTime } from '@duncit/app-settings';
import HostLeadDetailPage from '@/pages/host-leads/HostLeadDetailPage';
import { joinList, leadDate } from '@/pages/host-leads/HostLeadDetailPage/helpers';
import { CRM_DYNAMIC_FIELDS, HOST_LEAD } from '@/api/crm.gql';
import type { HostLead } from '@/api/crm.types';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { hostLead } from '../fixtures/leads';

const leadMock = (lead: HostLead | null): MockedResponse => ({
  request: { query: HOST_LEAD, variables: { id: 'host-1' } },
  // GraphQL answers an unset optional field with null, never by leaving it out.
  result: { data: { hostLead: lead && { matched_user: null, ...lead, interests: lead.interests ?? null } } },
  maxUsageCount: 5,
});

const dynamicFieldsMock: MockedResponse = {
  request: { query: CRM_DYNAMIC_FIELDS, variables: { entity: 'HOST_LEAD', include_inactive: false } },
  result: { data: { crmDynamicFields: [] } },
};

const renderPage = (lead: HostLead | null, extra: MockedResponse[] = []) =>
  renderWithApollo(<HostLeadDetailPage />, [leadMock(lead), ...extra], {
    route: '/host-leads/host-1/view',
    path: '/host-leads/:id/view',
  });

/** The value printed next to a LeadDetailRow label inside `scope`. */
const rowValue = (scope: HTMLElement, label: string) =>
  within(scope).getByText(label).nextElementSibling?.textContent;

const openTab = (value: string) => {
  fireEvent.click(screen.getByTestId(`lead-tab-${value}`));
  return screen.getByTestId(`lead-tabpanel-${value}`);
};

const fullLead = hostLead({
  interests: ['Running', 'Cycling', 'Trekking', 'Yoga'],
  instagram_link: 'https://instagram.com/puneRunners',
  community_link: 'https://chat.whatsapp.com/pune-runners',
  preferred_event_date: '2026-10-20T00:00:00.000Z',
  need_vendor: true,
  notes: 'Wants a Sunday slot\nNo alcohol',
});

const sparseLead = hostLead({
  super_category: null,
  host_type: null,
  organization_name: null,
  city: null,
  area: null,
  interests: undefined,
  expected_audience_size: null,
  frequency: null,
  budget_range: null,
  revenue_models: [],
  need_venue: false,
  preferred_day: null,
  preferred_time_slot: null,
  community_size: null,
  previous_events_hosted: false,
  past_attendees: null,
  host_intent_scores: [],
  lead_source: null,
  assigned_to: null,
  next_follow_up_date: null,
  services_offered: [],
  created_at: null,
  updated_at: null,
});

describe('HostLeadDetailPage', () => {
  it('says so when the host lead does not exist', async () => {
    renderPage(null);
    expect(await screen.findByText('Host lead not found.')).toBeInTheDocument();
  });

  it('shows the hero and the overview of a fully filled lead', async () => {
    renderPage(fullLead);

    expect(await screen.findByRole('heading', { level: 1, name: 'Pune Runners' })).toBeInTheDocument();
    expect(screen.getAllByText('Running').length).toBeGreaterThan(0);
    expect(screen.getByText('Cycling')).toBeInTheDocument();
    expect(screen.queryByText('Trekking')).toBeNull();
    expect(screen.getByText('+2 more')).toBeInTheDocument();

    const overview = screen.getByTestId('lead-tabpanel-overview');
    expect(rowValue(overview, 'Super category')).toBe('Events');
    expect(rowValue(overview, 'Type')).toBe('Community');
    expect(rowValue(overview, 'Organization')).toBe('Pune Runners Club');
    expect(rowValue(overview, 'Interests')).toBe('Running, Cycling, Trekking, Yoga');
    expect(rowValue(overview, 'Audience size')).toBe('50-100');
    expect(rowValue(overview, 'Frequency')).toBe('Weekly');
    expect(rowValue(overview, 'City')).toBe('Pune');
    expect(rowValue(overview, 'Area')).toBe('Aundh');
    expect(within(overview).getByRole('link', { name: /instagram\.com\/puneRunners/ })).toHaveAttribute(
      'href',
      'https://instagram.com/puneRunners',
    );
    expect(within(overview).getByRole('link', { name: /chat\.whatsapp\.com/ })).toHaveAttribute(
      'href',
      'https://chat.whatsapp.com/pune-runners',
    );
    expect(rowValue(overview, 'Community size')).toBe('400');
    expect(rowValue(overview, 'Previous events')).toBe('Yes');
    expect(rowValue(overview, 'Past attendees')).toBe('120');
    expect(rowValue(overview, 'Intent')).toBe('Hot');
    expect(rowValue(overview, 'Source')).toBe('Instagram');
    expect(rowValue(overview, 'Assigned to')).toBe('Priya');
    expect(rowValue(overview, 'Follow-up')).toBe(formatDate('2026-09-25T00:00:00.000Z'));
    expect(rowValue(overview, 'Created')).toBe(formatDateTime('2026-09-01T10:00:00.000Z'));
    expect(rowValue(overview, 'Updated')).toBe(formatDateTime('2026-09-02T10:00:00.000Z'));
    expect(within(overview).getByText('NOTES')).toBeInTheDocument();
    expect(within(overview).getByText(/Wants a Sunday slot/)).toBeInTheDocument();
  });

  it('falls back to dashes and hides empty extras for a sparse lead', async () => {
    renderPage(sparseLead);

    expect(await screen.findByRole('heading', { level: 1, name: 'Pune Runners' })).toBeInTheDocument();
    expect(screen.queryByText(/more$/)).toBeNull();

    const overview = screen.getByTestId('lead-tabpanel-overview');
    for (const label of [
      'Super category',
      'Type',
      'Organization',
      'Interests',
      'Audience size',
      'Frequency',
      'City',
      'Area',
      'Instagram',
      'Community link',
      'Community size',
      'Past attendees',
      'Intent',
      'Source',
      'Assigned to',
      'Follow-up',
      'Created',
      'Updated',
    ]) {
      expect(rowValue(overview, label)).toBe('—');
    }
    expect(rowValue(overview, 'Previous events')).toBe('No');
    expect(within(overview).queryByText('NOTES')).toBeNull();

    const plans = openTab('plans');
    expect(rowValue(plans, 'Budget')).toBe('—');
    expect(rowValue(plans, 'Revenue models')).toBe('—');
    expect(rowValue(plans, 'Needs venue')).toBe('No');
    expect(rowValue(plans, 'Needs vendor')).toBe('No');
    expect(rowValue(plans, 'Preferred date')).toBe('—');
    expect(rowValue(plans, 'Preferred day')).toBe('—');
    expect(rowValue(plans, 'Preferred slot')).toBe('—');

    const services = openTab('services');
    expect(within(services).getByText('Catalogue managed via Manage Host Services')).toBeInTheDocument();
    expect(screen.getByTestId('lead-tab-services')).toHaveTextContent('Services (0)');
  });

  it('shows the plans of a filled lead', async () => {
    renderPage(fullLead);
    await screen.findByRole('heading', { level: 1, name: 'Pune Runners' });

    const plans = openTab('plans');
    expect(within(plans).getByRole('heading', { name: 'Plans & timeline' })).toBeInTheDocument();
    expect(rowValue(plans, 'Budget')).toBe('10k-20k');
    expect(rowValue(plans, 'Revenue models')).toBe('Ticketed');
    expect(rowValue(plans, 'Needs venue')).toBe('Yes');
    expect(rowValue(plans, 'Needs vendor')).toBe('Yes');
    expect(rowValue(plans, 'Preferred date')).toBe(formatDate('2026-10-20T00:00:00.000Z'));
    expect(rowValue(plans, 'Preferred day')).toBe('Sunday');
    expect(rowValue(plans, 'Preferred slot')).toBe('Morning');
  });

  it('counts tagged services in the singular and plural', async () => {
    const { unmount } = renderPage(fullLead);
    await screen.findByRole('heading', { level: 1, name: 'Pune Runners' });
    expect(within(openTab('services')).getByText('1 service tagged')).toBeInTheDocument();
    unmount();

    renderPage(
      hostLead({
        services_offered: [
          { service: 'Catering', custom_name: null, description: null },
          { service: 'Decor', custom_name: null, description: null },
        ],
      }),
    );
    await screen.findByRole('heading', { level: 1, name: 'Pune Runners' });
    expect(within(openTab('services')).getByText('2 services tagged')).toBeInTheDocument();
  });

  it('lists the contacts, custom fields and manual logs of the lead', async () => {
    renderPage(fullLead, [dynamicFieldsMock]);
    await screen.findByRole('heading', { level: 1, name: 'Pune Runners' });

    expect(screen.getByTestId('lead-tab-contacts')).toHaveTextContent('Contacts (1)');
    expect(within(openTab('contacts')).getByText('Arjun Rao')).toBeInTheDocument();

    const custom = openTab('custom-fields');
    expect(within(custom).getByRole('heading', { name: 'Custom fields' })).toBeInTheDocument();
    expect(within(custom).getByText('Admin-defined fields from Settings → Dynamic Fields.')).toBeInTheDocument();
    expect(
      await within(custom).findByText(/No custom fields defined yet/),
    ).toBeInTheDocument();

    expect(within(openTab('manual-logs')).getByRole('heading', { name: 'Manual logs' })).toBeInTheDocument();
  });

  it('opens the Ask AI drawer and goes to the editor or back to the list', async () => {
    renderPage(fullLead);
    await screen.findByRole('heading', { level: 1, name: 'Pune Runners' });

    expect(screen.queryByRole('complementary', { name: 'Ask AI' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ask AI' }));
    const drawer = await screen.findByRole('complementary', { name: 'Ask AI' });
    expect(drawer).toBeVisible();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Ask AI' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Ask AI' }));
    expect(await screen.findByRole('complementary', { name: 'Ask AI' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/host-leads\/host-1$/);
  });

  it('shows the profile photo and the matched Duncit user of a lead', async () => {
    const { container } = renderPage(
      hostLead({
        profile_photo_url: 'https://cdn.duncit.com/hosts/pune-runners.png',
        matched_user: {
          user_id: 'user-9',
          full_name: 'Arjun Rao',
          email: 'arjun@puneRunners.in',
          phone: null,
          profile_photo: null,
          matched_on: 'EMAIL',
        },
      }),
    );
    await screen.findByRole('heading', { level: 1, name: 'Pune Runners' });

    expect(container.querySelector('img[src="https://cdn.duncit.com/hosts/pune-runners.png"]')).not.toBeNull();
    expect(screen.getAllByText('Also a Duncit user · Email match').length).toBeGreaterThan(0);
    expect(screen.getByText('Arjun Rao')).toBeInTheDocument();
  });

  it('switches to the survey, website, reminders and communications tabs through the URL', async () => {
    renderPage(fullLead);
    await screen.findByRole('heading', { level: 1, name: 'Pune Runners' });

    for (const value of ['survey', 'website', 'reminders', 'communications']) {
      expect(openTab(value)).toBeInTheDocument();
      expect(screen.getByTestId(`lead-tab-${value}`)).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('location')).toHaveTextContent(`tab=${value}`);
      expect(screen.queryByTestId('lead-tabpanel-overview')).toBeNull();
    }
  });

  it('goes back to the host leads list', async () => {
    renderPage(fullLead);
    await screen.findByRole('heading', { level: 1, name: 'Pune Runners' });

    fireEvent.click(screen.getByRole('button', { name: 'Back to Host Leads' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/host-leads$/);
  });
});

describe('host lead detail helpers', () => {
  it('joins a list, and dashes an empty or missing one', () => {
    expect(joinList(['Ticketed', 'Sponsored'])).toBe('Ticketed, Sponsored');
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
});
