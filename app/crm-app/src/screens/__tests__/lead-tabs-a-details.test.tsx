import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import type { Lead } from '@/features/leads/useLead';
import * as docs from '@/graphql/leadTabs';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { LeadCommercialTab } from '../lead/tabs/LeadCommercialTab';
import { LeadCustomFieldsTab } from '../lead/tabs/LeadCustomFieldsTab';
import { LeadLinkedHostsTab } from '../lead/tabs/LeadLinkedHostsTab';
import { LeadPlansTab } from '../lead/tabs/LeadPlansTab';
import { LeadServicesTab } from '../lead/tabs/LeadServicesTab';
import { LeadSocialTab } from '../lead/tabs/LeadSocialTab';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), push: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
}));

/** The lead page's detail tabs: Social, Services, Custom Fields, Commercial, Plans & Timeline, Linked Hosts. */

const request = gqlRequest as jest.Mock;
const lead: Lead = {
  id: 'v1',
  name: 'Grand Hall',
  city: 'Pune',
  lead_status: 'Won',
  priority: 'High',
  assigned_to: 'Priya',
  next_follow_up_date: null,
  contacts: [],
  activity_log: [],
};
const props = { kind: 'VENUE_LEAD' as const, id: 'v1', lead, onChanged: jest.fn() };
const answer = (data: unknown) => request.mockResolvedValue(data);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

describe('LeadSocialTab', () => {
  it('lists Instagram and every extra link, each opening in the browser', async () => {
    answer({
      venue: {
        id: 'v1',
        instagram_link: 'instagram.com/grandhall',
        social_links: [
          { name: 'YouTube', url: 'https://youtube.com/@grandhall' },
          { name: '', url: 'https://x.com/grandhall' },
        ],
      },
    });
    renderWithTheme(<LeadSocialTab {...props} />);
    expect(await screen.findByText('Social')).toBeOnTheScreen();
    expect(
      screen.getByText('View only. To change these, edit the lead and open its Social step.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('YouTube')).toBeOnTheScreen();
    expect(screen.getAllByText('https://x.com/grandhall')).toHaveLength(2);
    fireEvent.press(screen.getByLabelText('instagram.com/grandhall'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://instagram.com/grandhall');
    expect(request.mock.calls[0]?.[0]).toBe(docs.CrmAppLeadSocialDocument);
    expect(request.mock.calls[0]?.[1]).toEqual({
      id: 'v1',
      venue: true,
      host: false,
      ecomm: false,
      creator: false,
      community: false,
    });
  });

  it('says when the lead has no social channels', async () => {
    answer({ creator: { id: 'c1', instagram_link: null, social_links: [] } });
    renderWithTheme(<LeadSocialTab {...props} kind="CREATOR_LEAD" id="c1" />);
    expect(await screen.findByTestId('lead-social-empty')).toHaveTextContent(
      'No social channels added yet.',
    );
  });

  it('shows a load failure with a retry, and "not found" when the lead is gone', async () => {
    request.mockRejectedValueOnce(new Error('Network down'));
    renderWithTheme(<LeadSocialTab {...props} />);
    expect(await screen.findByText('Network down')).toBeOnTheScreen();
    answer({ venue: null });
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(await screen.findByText('This lead was not found.')).toBeOnTheScreen();
  });
});

describe('LeadServicesTab', () => {
  it('shows each service with its description, a custom one marked Custom', async () => {
    answer({
      venue: {
        id: 'v1',
        services_offered: [
          { service: 'Catering', custom_name: null, description: 'Veg and non-veg buffets' },
          { service: 'Other', custom_name: 'Fire show', description: null },
        ],
      },
    });
    renderWithTheme(<LeadServicesTab {...props} />);
    expect(await screen.findByText('Services offered')).toBeOnTheScreen();
    expect(screen.getByText('2 services')).toBeOnTheScreen();
    expect(screen.getByText('Veg and non-veg buffets')).toBeOnTheScreen();
    expect(screen.getByText('Fire show')).toBeOnTheScreen();
    expect(screen.getByText('Custom')).toBeOnTheScreen();
    expect(screen.getByText('No description.')).toBeOnTheScreen();
  });

  it('says when no services are tagged', async () => {
    answer({ host: { id: 'h1', services_offered: [] } });
    renderWithTheme(<LeadServicesTab {...props} kind="HOST_LEAD" id="h1" />);
    expect(
      await screen.findByText('No services yet. Add them on the lead form.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('No services tagged yet.')).toBeOnTheScreen();
  });
});

describe('LeadCustomFieldsTab', () => {
  it('prints each active field with its value, in words', async () => {
    answer({
      crmDynamicFields: [
        { id: 'f1', name: 'parking', label: 'Parking', kind: 'boolean', options: [] },
        {
          id: 'f2',
          name: 'perks',
          label: 'Perks',
          kind: 'select',
          options: [{ value: 'wifi', label: 'Wi-Fi' }],
        },
        { id: 'f3', name: 'floor', label: 'Floor', kind: 'text', options: [] },
      ],
      ecomm: { id: 'e1', dynamic_values_json: '{"parking":false,"perks":["wifi"]}' },
    });
    renderWithTheme(<LeadCustomFieldsTab {...props} kind="ECOMM_LEAD" id="e1" />);
    expect(await screen.findByText('Custom fields')).toBeOnTheScreen();
    expect(screen.getByTestId('lead-custom-field-parking')).toHaveTextContent('ParkingNo');
    expect(screen.getByTestId('lead-custom-field-perks')).toHaveTextContent('PerksWi-Fi');
    expect(screen.getByTestId('lead-custom-field-floor')).toHaveTextContent('Floor—');
    expect(request.mock.calls[0]?.[1]).toMatchObject({ entity: 'ECOMM_LEAD', ecomm: true });
  });

  it('says when no custom fields are defined', async () => {
    answer({ crmDynamicFields: [], venue: { id: 'v1', dynamic_values_json: '' } });
    renderWithTheme(<LeadCustomFieldsTab {...props} />);
    expect(await screen.findByTestId('lead-custom-fields-empty')).toHaveTextContent(
      'No custom fields defined yet. Open Settings → Dynamic Fields to add some.',
    );
  });
});

describe('LeadCommercialTab', () => {
  it('shows the pricing models, charges, deposit, GST and invoice', async () => {
    answer({
      venueLead: {
        id: 'v1',
        pricing_models: ['Hourly', 'Per head'],
        expected_charges: 5000,
        security_deposit: null,
        gst_applicable: true,
        invoice_available: false,
      },
    });
    renderWithTheme(<LeadCommercialTab {...props} />);
    expect(await screen.findByText('Commercial')).toBeOnTheScreen();
    expect(screen.getByText('Hourly, Per head')).toBeOnTheScreen();
    expect(screen.getByText('₹ 5000')).toBeOnTheScreen();
    expect(screen.getByText('Applicable')).toBeOnTheScreen();
    expect(screen.getByText('No')).toBeOnTheScreen();
    expect(screen.getAllByText('—')).toHaveLength(1);
  });

  it('says GST is not applicable and the invoice is available', async () => {
    answer({
      venueLead: {
        id: 'v1',
        pricing_models: [],
        expected_charges: null,
        security_deposit: 2000,
        gst_applicable: false,
        invoice_available: true,
      },
    });
    renderWithTheme(<LeadCommercialTab {...props} />);
    expect(await screen.findByText('₹ 2000')).toBeOnTheScreen();
    expect(screen.getByText('Available')).toBeOnTheScreen();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});

describe('LeadPlansTab', () => {
  it('shows the budget, revenue models, needs and preferred timing', async () => {
    answer({
      hostLead: {
        id: 'h1',
        budget_range: '₹10k-50k',
        revenue_models: ['Ticketed'],
        need_venue: true,
        need_vendor: false,
        preferred_event_date: null,
        preferred_day: 'Saturday',
        preferred_time_slot: null,
      },
    });
    renderWithTheme(<LeadPlansTab {...props} kind="HOST_LEAD" id="h1" />);
    expect(await screen.findByText('Plans & timeline')).toBeOnTheScreen();
    expect(screen.getByText('₹10k-50k')).toBeOnTheScreen();
    expect(screen.getByText('Ticketed')).toBeOnTheScreen();
    expect(screen.getByText('Yes')).toBeOnTheScreen();
    expect(screen.getByText('No')).toBeOnTheScreen();
    expect(screen.getByText('Saturday')).toBeOnTheScreen();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});

describe('LeadLinkedHostsTab', () => {
  it('lists the linked host leads and opens one', async () => {
    answer({
      venueLead: {
        id: 'v1',
        linked_hosts: [
          {
            id: 'h1',
            host_name: 'Run Club',
            host_type: 'Club',
            city: 'Pune',
            lead_status: 'New',
            priority: 'Low',
          },
          {
            id: 'h2',
            host_name: 'Book Circle',
            host_type: null,
            city: null,
            lead_status: null,
            priority: null,
          },
        ],
      },
    });
    renderWithTheme(<LeadLinkedHostsTab {...props} />);
    expect(await screen.findByText('Run Club')).toBeOnTheScreen();
    expect(screen.getByText('Club · Pune')).toBeOnTheScreen();
    expect(screen.getByText('New')).toBeOnTheScreen();
    expect(screen.getByText('Low')).toBeOnTheScreen();
    expect(screen.getByText('—')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('lead-linked-host-h2'));
    expect(mockNav.push).toHaveBeenCalledWith('LeadDetail', { kind: 'HOST_LEAD', id: 'h2' });
  });

  it('says when no hosts are linked', async () => {
    answer({ venueLead: { id: 'v1', linked_hosts: [] } });
    renderWithTheme(<LeadLinkedHostsTab {...props} />);
    expect(await screen.findByTestId('lead-linked-hosts-empty')).toHaveTextContent(
      'No hosts linked yet. Open Edit → "Linked Hosts" to associate host leads.',
    );
  });
});
