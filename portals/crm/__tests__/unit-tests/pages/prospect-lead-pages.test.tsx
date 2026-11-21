import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ProspectLeadsPage from '@/pages/prospect-leads/ProspectLeadsPage';
import ProspectLeadEditorPage from '@/pages/prospect-leads/ProspectLeadEditorPage';
import ProspectLeadDetailPage from '@/pages/prospect-leads/ProspectLeadDetailPage';
import { CRM_LEAD_CONFIG, SUPER_CATEGORIES } from '@/api/crm.gql';
import {
  COMMUNITY_LEAD,
  COMMUNITY_LEADS_TABLE,
  CREATE_CREATOR_LEAD,
  CREATOR_LEAD,
  DELETE_COMMUNITY_LEAD,
  UPDATE_COMMUNITY_LEAD,
} from '@/api/prospectLeads.gql';
import type { CrmOptionGroup } from '@/api/crm.types';
import type { CommunityLead, CreatorLead } from '@/api/prospectLeads.types';
import { creatorLeadInitialValues, fromCommunityLead, toCommunityLeadInput, toCreatorLeadInput } from '@/forms/prospect-lead';
import { emptyContact } from '@/forms/fields/ContactsField';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { emptyAskAiThread } from '../helpers/askAiThreadMock';

const config: CrmOptionGroup = {
  venue_types: [], space_types: [], venue_event_suitability: [], week_days: [], booking_notices: [],
  pricing_models: [], amenities: [], lead_sources: ['Instagram'], venue_lead_statuses: [], host_lead_statuses: ['New'],
  priorities: ['High', 'Medium'], host_types: [], host_interests: [], audience_sizes: [], frequencies: ['Weekly'],
  revenue_models: [], host_intent_scores: [], services_offered_options: [],
  venue_services_offered_options: [], host_services_offered_options: [],
  creator_platforms: ['Instagram'], collaboration_types: ['Barter'], community_types: ['Running Club'], community_platforms: ['WhatsApp'],
};
const configMock: MockedResponse = { request: { query: CRM_LEAD_CONFIG }, result: { data: { crmLeadConfig: config } }, maxUsageCount: 5 };
const superCategoriesMock: MockedResponse = {
  request: { query: SUPER_CATEGORIES },
  result: { data: { categories: [{ id: 'sc-1', name: 'Fitness', slug: 'fitness', icon: '', is_active: true, sort_order: 0 }] } },
  maxUsageCount: 5,
};

const backbone = {
  super_category_id: 'sc-1',
  super_category: { id: 'sc-1', name: 'Fitness', slug: 'fitness', icon: '' },
  city: 'Pune',
  area: '',
  contacts: [{ name: 'Riya', role: 'Owner', mobile_number: '9811100001', whatsapp_number: '', email: 'riya@example.com' }],
  website: '',
  instagram_link: '',
  social_links: [{ name: 'YouTube', url: 'https://youtube.com/@riyaruns' }],
  services_offered: [{ service: 'Run coaching', custom_name: null, description: 'Weekend 5k plans' }],
  tags: ['runner'],
  profile_photo_url: '',
  dynamic_values_json: '{}',
  lead_source: 'Instagram',
  assigned_to: 'Asha',
  lead_status: 'New',
  priority: 'High',
  next_follow_up_date: null,
  notes: 'Prefers barter.',
  activity_log: [],
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};
const creator: CreatorLead = {
  ...backbone,
  id: 'cr-1',
  creator_name: 'Riya Runs',
  handle: '@riyaruns',
  primary_platform: 'Instagram',
  niches: ['Fitness', 'Running'],
  followers_count: 48200,
  engagement_rate: 4.5,
  profile_links: [],
  collaboration_types: ['Barter'],
  rate_card: '',
};
const community: CommunityLead = {
  ...backbone,
  id: 'cm-1',
  community_name: 'Pune Trail Runners',
  community_type: 'Running Club',
  platform: 'WhatsApp',
  member_count: 320,
  meetup_frequency: 'Weekly',
  community_link: '',
  interests: ['Trail running'],
  partnership_interests: [],
};

const withDates = (ui: React.ReactElement) => <LocalizationProvider dateAdapter={AdapterDateFns}>{ui}</LocalizationProvider>;

beforeEach(() => globalThis.localStorage.clear());

describe('ProspectLeadEditorPage', () => {
  it('creates a creator lead through createCreatorLead and returns to the list', async () => {
    const create = vi.fn(() => ({ data: { createCreatorLead: creator } }));
    const expectedInput = toCreatorLeadInput({
      ...creatorLeadInitialValues,
      super_category_id: 'sc-1',
      creator_name: 'Riya Runs',
      contacts: [{ ...emptyContact, name: 'Riya', mobile_number: '9811100001' }],
    });
    renderWithApollo(withDates(<ProspectLeadEditorPage entity="CREATOR_LEAD" />), [
      configMock,
      superCategoriesMock,
      { request: { query: CREATE_CREATOR_LEAD, variables: { input: expectedInput } }, result: create },
    ], { route: '/creator-leads/new', path: '/creator-leads/new' });

    expect(await screen.findByRole('heading', { level: 1, name: 'New Creator Lead' })).toBeInTheDocument();
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /super category/i }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Fitness' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Creator name/i }), { target: { value: 'Riya Runs' } });
    fireEvent.click(screen.getByRole('button', { name: /2\. Contact Details/ }));
    fireEvent.change(await screen.findByRole('textbox', { name: /^Name/ }), { target: { value: 'Riya' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Mobile Number/ }), { target: { value: '9811100001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create creator lead' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/creator-leads$/));
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('updates a community lead and returns to its detail page', async () => {
    const update = vi.fn(() => ({ data: { updateCommunityLead: community } }));
    renderWithApollo(withDates(<ProspectLeadEditorPage entity="COMMUNITY_LEAD" />), [
      configMock,
      superCategoriesMock,
      { request: { query: COMMUNITY_LEAD, variables: { id: 'cm-1' } }, result: { data: { communityLead: community } } },
      {
        request: { query: UPDATE_COMMUNITY_LEAD, variables: { id: 'cm-1', input: toCommunityLeadInput(fromCommunityLead(community)) } },
        result: update,
      },
    ], { route: '/community-leads/cm-1', path: '/community-leads/:id' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Edit Pune Trail Runners' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update community lead' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/community-leads\/cm-1\/view$/));
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('reports an unknown lead instead of an empty form', async () => {
    renderWithApollo(withDates(<ProspectLeadEditorPage entity="CREATOR_LEAD" />), [
      configMock,
      { request: { query: CREATOR_LEAD, variables: { id: 'gone' } }, result: { data: { creatorLead: null } } },
    ], { route: '/creator-leads/gone', path: '/creator-leads/:id' });

    expect(await screen.findByText('Creator lead not found.')).toBeInTheDocument();
  });
});

const tableVars = {
  query: { search: null, page: 1, page_size: 25, sort_by: 'next_follow_up_date', sort_dir: 'asc', filters: [] },
};
const communityTable = (rows: unknown[]): MockedResponse => ({
  request: { query: COMMUNITY_LEADS_TABLE, variables: tableVars },
  result: { data: { communityLeadsTable: { total: rows.length, rows } } },
});

describe('ProspectLeadsPage', () => {
  it('lists community leads with their type, routes to new/edit and deletes after confirmation', async () => {
    const remove = vi.fn(() => ({ data: { deleteCommunityLead: true } }));
    renderWithApollo(<ProspectLeadsPage entity="COMMUNITY_LEAD" />, [
      configMock,
      superCategoriesMock,
      communityTable([community]),
      { request: { query: DELETE_COMMUNITY_LEAD, variables: { id: 'cm-1' } }, result: remove },
      communityTable([]),
    ], { route: '/community-leads' });

    expect(screen.getByRole('heading', { level: 1, name: 'Community Leads' })).toBeInTheDocument();
    expect(await screen.findByText('Pune Trail Runners')).toBeInTheDocument();
    expect(screen.getByText('Running Club')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Delete lead'));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Delete "Pune Trail Runners"? This cannot be undone.')).toBeInTheDocument();
    fireEvent.click(dialog.getByTestId('confirm-dialog-confirm'));

    expect(await screen.findByText('Community lead deleted')).toBeInTheDocument();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/No community leads yet/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New Community Lead' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/community-leads/new');
  });
});

describe('ProspectLeadDetailPage', () => {
  it('shows a creator profile with reach, collaboration and tracking', async () => {
    renderWithApollo(<ProspectLeadDetailPage entity="CREATOR_LEAD" />, [
      { request: { query: CREATOR_LEAD, variables: { id: 'cr-1' } }, result: { data: { creatorLead: creator } } },
    ], { route: '/creator-leads/cr-1/view', path: '/creator-leads/:id/view' });

    expect(await screen.findByTestId('lead-detail-name')).toHaveTextContent('Riya Runs');
    expect(screen.getByText('@riyaruns')).toBeInTheDocument();
    expect(screen.getByText('Fitness, Running')).toBeInTheDocument();
    expect(screen.getByText('4.5%')).toBeInTheDocument();
    expect(screen.getByText('Prefers barter.')).toBeInTheDocument();
    expect(screen.getByText('Assigned to Asha')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Contacts \(1\)/ })).toBeInTheDocument();

    // The extra social link sits under Online presence, labelled with its name and opening in a new tab.
    const overview = screen.getByTestId('lead-tabpanel-overview');
    expect(within(overview).getByText('YouTube')).toBeInTheDocument();
    const youtube = within(overview).getByRole('link', { name: /youtube\.com\/@riyaruns/ });
    expect(youtube).toHaveAttribute('href', 'https://youtube.com/@riyaruns');
    expect(youtube).toHaveAttribute('target', '_blank');

    // Services and Logos & Images are tabs on the creator page too.
    expect(screen.getByTestId('lead-tab-services')).toHaveTextContent('Services (1)');
    expect(screen.getByTestId('lead-tab-media')).toHaveTextContent('Logos & Images');
    fireEvent.click(screen.getByTestId('lead-tab-services'));
    const services = screen.getByTestId('lead-tabpanel-services');
    expect(within(services).getByText('1 service')).toBeInTheDocument();
    expect(within(services).getByText('Run coaching')).toBeInTheDocument();
    expect(within(services).getByText('Weekend 5k plans')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/creator-leads/cr-1');
  });

  it('shows a community profile and goes back to its list', async () => {
    renderWithApollo(<ProspectLeadDetailPage entity="COMMUNITY_LEAD" />, [
      { request: { query: COMMUNITY_LEAD, variables: { id: 'cm-1' } }, result: { data: { communityLead: community } } },
    ], { route: '/community-leads/cm-1/view', path: '/community-leads/:id/view' });

    expect(await screen.findByTestId('lead-detail-name')).toHaveTextContent('Pune Trail Runners');
    expect(screen.getAllByText('320').length).toBeGreaterThan(0);
    expect(screen.getByText('Trail running')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Back to Community Leads'));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/community-leads$/);
  });

  it('opens Ask AI grounded in this community lead', async () => {
    renderWithApollo(<ProspectLeadDetailPage entity="COMMUNITY_LEAD" />, [
      { request: { query: COMMUNITY_LEAD, variables: { id: 'cm-1' } }, result: { data: { communityLead: community } } },
      emptyAskAiThread('COMMUNITY_LEAD', 'cm-1'),
    ], { route: '/community-leads/cm-1/view', path: '/community-leads/:id/view' });
    await screen.findByTestId('lead-detail-name');

    fireEvent.click(screen.getByRole('button', { name: 'Ask AI' }));

    const drawer = await screen.findByRole('complementary', { name: 'Ask AI' });
    expect(drawer).toHaveTextContent('About Pune Trail Runners');
    expect(await screen.findByText('120 tokens · 1.0 KB from 1 sources')).toBeInTheDocument();
  });

  it('says so when the lead does not exist', async () => {
    renderWithApollo(<ProspectLeadDetailPage entity="COMMUNITY_LEAD" />, [
      { request: { query: COMMUNITY_LEAD, variables: { id: 'gone' } }, result: { data: { communityLead: null } } },
    ], { route: '/community-leads/gone/view', path: '/community-leads/:id/view' });

    expect(await screen.findByText('Community lead not found.')).toBeInTheDocument();
  });
});
