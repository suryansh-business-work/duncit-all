import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { formatDate, formatDateTime } from '@duncit/app-settings';
import EcommLeadDetailPage from '@/pages/ecomm-leads/EcommLeadDetailPage';
import { CRM_DYNAMIC_FIELDS, ECOMM_LEAD } from '@/api/crm.gql';
import { COMMUNICATION_LOGS } from '@/api/comms.gql';
import { LEAD_SURVEY } from '@/components/lead-survey/queries';
import type { CrmMatchedUser, EcommLead } from '@/api/crm.types';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { contact, ecommLead } from '../fixtures/leads';

type DetailLead = EcommLead & { matched_user: CrmMatchedUser | null };

const lead = (overrides: Partial<DetailLead> = {}): DetailLead => ({
  ...ecommLead(),
  matched_user: null,
  ...overrides,
});

/** Every optional field blank, so each fallback on the page is what renders. */
const sparseLead = (overrides: Partial<DetailLead> = {}): DetailLead =>
  lead({
    super_category: null,
    brand_name: null,
    business_type: null,
    city: null,
    area: null,
    product_categories: [],
    catalog_size: '',
    price_range: null,
    fulfilment_mode: null,
    monthly_orders: '',
    gst_number: null,
    gst_applicable: false,
    website: null,
    instagram_link: 'https://instagram.com/kavyahandlooms',
    marketplace_links: ['Amazon', 'Flipkart'],
    tags: [],
    lead_source: null,
    assigned_to: null,
    next_follow_up_date: null,
    created_at: null,
    updated_at: null,
    notes: 'Call after Pongal',
    ...overrides,
  } as Partial<DetailLead>);

const leadMock = (value: DetailLead | null): MockedResponse => ({
  request: { query: ECOMM_LEAD, variables: { id: 'ecomm-1' } },
  result: { data: { ecommLead: value } },
});

const dynamicFieldsMock: MockedResponse = {
  request: { query: CRM_DYNAMIC_FIELDS, variables: { entity: 'ECOMM_LEAD', include_inactive: false } },
  result: {
    data: {
      crmDynamicFields: [
        {
          id: 'df1',
          name: 'followers',
          label: 'Instagram followers',
          kind: 'number',
          options: [],
          multi: false,
          placeholder: null,
          default_value: null,
          hint: null,
          applies_to_venue: false,
          applies_to_host: false,
          applies_to_ecomm: true,
          required: false,
          sort_order: 0,
          is_active: true,
          created_at: '2026-09-01T10:00:00.000Z',
          updated_at: '2026-09-01T10:00:00.000Z',
        },
      ],
    },
  },
};

const renderPage = (mocks: MockedResponse[]) =>
  renderWithApollo(<EcommLeadDetailPage />, mocks, { route: '/ecomm-leads/ecomm-1/view', path: '/ecomm-leads/:id/view' });

/** The value printed next to a detail row's label inside `scope`. */
const rowValue = (scope: HTMLElement, label: string) => {
  const labelNode = within(scope).getByText(label, { selector: 'span' });
  return labelNode.parentElement?.lastElementChild?.textContent;
};

/** The stat tile (card) carrying `label`. */
const tile = (label: string) => screen.getByText(label).closest('.MuiCard-root') as HTMLElement;

const overview = () => screen.getByTestId('lead-tabpanel-overview');

describe('EcommLeadDetailPage', () => {
  it('shows the not-found state when the lead does not exist', async () => {
    renderPage([leadMock(null)]);

    expect(await screen.findByText('Ecomm lead not found.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('renders the hero, stat tiles and overview of a fully filled lead', async () => {
    renderPage([leadMock(lead())]);

    expect(await screen.findByRole('heading', { level: 1, name: 'Kavya Iyer' })).toBeInTheDocument();
    expect(screen.getByText('Chennai', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(screen.getByText('Kavya Handlooms', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(screen.getByText('Events', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(within(screen.getByTestId('ecomm-tags')).getByText('#priority-city')).toBeInTheDocument();
    expect(screen.queryByTestId('matched-user-box')).toBeNull();

    expect(tile('Catalogue')).toHaveTextContent('50-100');
    expect(tile('Catalogue')).toHaveTextContent('Price range ₹1k-5k');
    expect(tile('Services')).toHaveTextContent('1');
    expect(tile('Services')).toHaveTextContent('Catering');
    expect(screen.getAllByText('Monthly orders')[0].closest('.MuiCard-root')).toHaveTextContent('Fulfilment: Self-ship');
    const followUp = formatDate('2026-09-25T00:00:00.000Z');
    expect(followUp).toBeTruthy();
    expect(tile('Next follow-up')).toHaveTextContent(followUp);
    expect(tile('Next follow-up')).toHaveTextContent('Assigned to Priya');

    const panel = overview();
    expect(rowValue(panel, 'Super category')).toBe('Events');
    expect(rowValue(panel, 'Brand')).toBe('Kavya Handlooms');
    expect(rowValue(panel, 'Business type')).toBe('D2C brand');
    expect(rowValue(panel, 'Product categories')).toBe('Sarees');
    expect(rowValue(panel, 'Catalogue size')).toBe('50-100');
    expect(rowValue(panel, 'Price range')).toBe('₹1k-5k');
    expect(rowValue(panel, 'Monthly orders')).toBe('100-500');
    expect(rowValue(panel, 'City')).toBe('Chennai');
    expect(rowValue(panel, 'Area')).toBe('Mylapore');
    expect(rowValue(panel, 'GST number')).toBe('33ABCDE1234F1Z5');
    expect(rowValue(panel, 'GST applicable')).toBe('Yes');
    expect(within(panel).getByRole('link', { name: /kavyahandlooms\.in/ })).toHaveAttribute('href', 'https://kavyahandlooms.in');
    expect(rowValue(panel, 'Instagram')).toBe('—');
    expect(rowValue(panel, 'Marketplaces')).toBe('—');
    expect(rowValue(panel, 'Source')).toBe('Instagram');
    expect(rowValue(panel, 'Assigned to')).toBe('Priya');
    expect(rowValue(panel, 'Follow-up')).toBe(followUp);
    expect(rowValue(panel, 'Created')).toBe(formatDateTime('2026-09-01T10:00:00.000Z'));
    expect(rowValue(panel, 'Updated')).toBe(formatDateTime('2026-09-02T10:00:00.000Z'));
    expect(within(panel).queryByText('NOTES')).toBeNull();
  });

  it('falls back to placeholders for every blank field and surfaces the matched Duncit user', async () => {
    renderPage([
      leadMock(
        sparseLead({
          profile_photo_url: 'https://cdn.duncit.com/kavya.png',
          matched_user: {
            user_id: 'u1',
            full_name: 'Kavya Iyer',
            email: 'kavya@handlooms.in',
            phone: '9840000000',
            profile_photo: null,
            matched_on: 'PHONE',
          },
          services_offered: [
            { service: 'Other', custom_name: 'Gift wrapping', description: null },
            { service: 'Other', custom_name: null, description: null },
            { service: 'Catering', custom_name: null, description: null },
          ],
        }),
      ),
    ]);

    expect(await screen.findByRole('heading', { level: 1, name: 'Kavya Iyer' })).toBeInTheDocument();
    // Once as the hero chip, once inside the matched-user box.
    expect(screen.getAllByText('Also a Duncit user · Phone match')).toHaveLength(2);
    expect(within(screen.getByTestId('matched-user-box')).getByText(/kavya@handlooms\.in/)).toBeInTheDocument();
    expect(screen.queryByTestId('ecomm-tags')).toBeNull();
    expect(screen.queryByText('Chennai')).toBeNull();

    expect(tile('Catalogue')).toHaveTextContent('Price range not set');
    expect(tile('Services')).toHaveTextContent('3');
    // Only the first two services are previewed; a custom "Other" shows its own name.
    expect(tile('Services')).toHaveTextContent('Gift wrapping, Other');
    expect(tile('Services')).not.toHaveTextContent('Catering');
    expect(screen.getAllByText('Monthly orders')[0].closest('.MuiCard-root')).toHaveTextContent('Fulfilment not set');
    expect(tile('Next follow-up')).toHaveTextContent('Unassigned');

    const panel = overview();
    for (const label of [
      'Super category',
      'Brand',
      'Business type',
      'Product categories',
      'Catalogue size',
      'Price range',
      'Monthly orders',
      'City',
      'Area',
      'GST number',
      'Website',
      'Source',
      'Assigned to',
      'Follow-up',
      'Created',
      'Updated',
    ]) {
      expect(rowValue(panel, label)).toBe('—');
    }
    expect(rowValue(panel, 'GST applicable')).toBe('No');
    expect(within(panel).getByRole('link', { name: /instagram\.com\/kavyahandlooms/ })).toHaveAttribute(
      'href',
      'https://instagram.com/kavyahandlooms',
    );
    expect(rowValue(panel, 'Marketplaces')).toBe('Amazon, Flipkart');
    expect(within(panel).getByText('NOTES')).toBeInTheDocument();
    expect(within(panel).getByText('Call after Pongal')).toBeInTheDocument();
  });

  it('says no services are tagged when the lead has none', async () => {
    renderPage([leadMock(sparseLead({ services_offered: [] }))]);

    await screen.findByRole('heading', { level: 1, name: 'Kavya Iyer' });
    expect(tile('Services')).toHaveTextContent('0');
    expect(tile('Services')).toHaveTextContent('None tagged');
    expect(tile('Catalogue')).toHaveTextContent('—');
    expect(tile('Next follow-up')).toHaveTextContent('—');

    fireEvent.click(screen.getByRole('tab', { name: 'Services (0)' }));
    expect(await screen.findByText('Catalogue managed via Manage Ecomm Services')).toBeInTheDocument();
  });

  it('opens the contacts, services, custom-field and manual-log tabs with the lead data', async () => {
    renderPage([
      leadMock(
        lead({
          contacts: [contact({ name: 'Kavya Iyer' }), contact({ name: 'Ravi Iyer', mobile_number: '9840011111' })],
          dynamic_values_json: '{"followers":1200}',
          activity_log: [
            {
              type: 'NOTE',
              summary: 'Shared the onboarding deck',
              status: null,
              target: null,
              body_html: null,
              body_text: null,
              created_by: 'Priya',
              created_at: '2026-09-03T10:00:00.000Z',
            },
          ],
        } as Partial<DetailLead>),
      ),
      dynamicFieldsMock,
    ]);
    await screen.findByRole('heading', { level: 1, name: 'Kavya Iyer' });

    fireEvent.click(screen.getByRole('tab', { name: 'Contacts (2)' }));
    expect(await within(screen.getByTestId('lead-tabpanel-contacts')).findByText('Ravi Iyer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Services (1)' }));
    const services = screen.getByTestId('lead-tabpanel-services');
    expect(within(services).getByRole('heading', { name: 'Services offered' })).toBeInTheDocument();
    expect(within(services).getByText('1 service tagged')).toBeInTheDocument();
    expect(within(services).getByText('Veg + Jain menus')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Custom Fields' }));
    const custom = screen.getByTestId('lead-tabpanel-custom-fields');
    expect(within(custom).getByRole('heading', { name: 'Custom fields' })).toBeInTheDocument();
    expect(within(custom).getByText('Admin-defined fields from Settings → Dynamic Fields.')).toBeInTheDocument();
    await within(custom).findByText('Instagram followers');
    expect(rowValue(custom, 'Instagram followers')).toBe('1200');

    fireEvent.click(screen.getByRole('tab', { name: 'Manual Logs' }));
    expect(await within(screen.getByTestId('lead-tabpanel-manual-logs')).findByText('Shared the onboarding deck')).toBeInTheDocument();
  });

  it('scopes the survey and communications tabs to this ecomm lead', async () => {
    renderPage([
      leadMock(lead()),
      {
        request: {
          query: LEAD_SURVEY,
          variables: { entity: 'ECOMM_LEAD', lead_id: 'ecomm-1', category_id: null, sub_category_id: null },
        },
        result: {
          data: {
            leadSurvey: {
              survey: { id: 's1', title: 'Seller onboarding survey', questions: [] },
              entries: [],
              categories: [],
              sub_categories: [],
            },
          },
        },
      },
      {
        request: {
          query: COMMUNICATION_LOGS,
          variables: { filter: { entity_type: 'ECOMM_LEAD', entity_id: 'ecomm-1', type: null }, limit: 100, offset: 0 },
        },
        result: { data: { communicationLogs: { items: [], total: 0 } } },
      },
    ]);
    await screen.findByRole('heading', { level: 1, name: 'Kavya Iyer' });

    fireEvent.click(screen.getByRole('tab', { name: 'Survey' }));
    expect(
      await within(screen.getByTestId('lead-tabpanel-survey')).findByRole('heading', { name: 'Seller onboarding survey' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Communications' }));
    expect(
      await within(screen.getByTestId('lead-tabpanel-communications')).findByText(/^No communication yet\./),
    ).toBeInTheDocument();
  });

  it('pluralises the services subtitle when more than one is tagged', async () => {
    renderPage([
      leadMock(
        lead({
          services_offered: [
            { service: 'Catering', custom_name: null, description: null },
            { service: 'Decor', custom_name: null, description: null },
          ],
        }),
      ),
    ]);
    await screen.findByRole('heading', { level: 1, name: 'Kavya Iyer' });

    fireEvent.click(screen.getByRole('tab', { name: 'Services (2)' }));
    expect(screen.getByText('2 services tagged')).toBeInTheDocument();
  });

  it('opens the editor from the Edit button', async () => {
    renderPage([leadMock(lead())]);
    await screen.findByRole('heading', { level: 1, name: 'Kavya Iyer' });

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/ecomm-leads/ecomm-1');
  });

  it('the back button returns to the ecomm leads list', async () => {
    renderPage([leadMock(lead())]);
    await screen.findByRole('heading', { level: 1, name: 'Kavya Iyer' });

    fireEvent.click(screen.getByRole('button', { name: /Back to Ecomm Leads/ }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/ecomm-leads$/);
  });
});
