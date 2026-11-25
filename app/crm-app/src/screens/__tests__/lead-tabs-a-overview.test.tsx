import { Linking } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';

import type { LeadKind } from '@/features/leads/leadKinds';
import type { Lead } from '@/features/leads/useLead';
import { CrmAppVerifyEmailDocument } from '@/graphql/emailVerification';
import * as docs from '@/graphql/leadTabs';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { LeadOverviewDetails } from '../lead/tabs/LeadOverviewDetails';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), push: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
}));

/** The lead page's hero, stat tiles and overview cards, for every kind (the portal's detail pages). */

const request = gqlRequest as jest.Mock;
const lead: Lead = {
  id: 'v1',
  name: 'Grand Hall',
  city: 'Pune',
  lead_status: 'Won',
  priority: 'High',
  assigned_to: 'Priya',
  next_follow_up_date: null,
  contacts: [
    {
      name: 'Meera',
      role: 'Owner',
      mobile_number: '9812345678',
      whatsapp_number: '+91 98123 45678',
      email: 'meera@grandhall.in',
    },
  ],
  activity_log: [],
};
const shared = {
  tags: ['corporate'],
  super_category: { name: 'Events' },
  area: 'Koregaon Park',
  website: 'grandhall.in',
  lead_source: 'Walk-in',
  created_at: null,
  updated_at: null,
};
const matched = {
  full_name: 'Asha Rao',
  email: 'asha@duncit.com',
  phone: '9800000000',
  matched_on: 'EMAIL',
  platforms_used: ['ANDROID'],
  last_activity_at: null,
};
const venue = {
  id: 'v1',
  ...shared,
  logo_url: 'https://cdn.duncit.com/logo.png',
  venue_types: ['Banquet', 'Rooftop', 'Lawn'],
  matched_user: matched,
  capacity_min: 20,
  capacity_max: 80,
  space_type: 'Indoor',
  services_offered: [
    { service: 'Catering', custom_name: null },
    { service: 'Other', custom_name: 'DJ' },
  ],
  expected_charges: 5000,
  security_deposit: 2000,
  venue_description: 'A hall by the river',
  full_address: '12 MG Road',
  landmark: null,
  map_link: 'https://maps.app.goo.gl/hall',
  available_days: ['Sat', 'Sun'],
  available_time_slots: 'Evenings',
  booking_notice: '2 days',
  event_suitability: ['Weddings'],
  amenities: [],
  remarks: 'Owner prefers calls after 6',
};

type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overview: Record<string, unknown>, extra: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = extra.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppLeadOverviewDocument) return overview;
    if (doc === docs.CrmAppLeadQualityRingDocument)
      return {
        crmLeadQuality: { result: { score: 72, tone: 'warning', classification_label: 'Good' } },
      };
    if (doc === docs.CrmAppContactEmailStatusesDocument)
      return {
        crmEmailStatuses: [
          {
            email: 'asha@duncit.com',
            status: 'VERIFIED',
            checked_at: '2026-11-01T10:00:00.000Z',
            suggestion: '',
          },
        ],
      };
    if (doc === docs.CrmAppComposeProvidersDocument) return { commsProviderOptions: [] };
    throw new Error('unexpected operation');
  });
const render = (kind: LeadKind, onOpenTab?: (tab: string) => void, cardLead: Lead = lead) =>
  renderWithTheme(
    <LeadOverviewDetails
      kind={kind}
      id="v1"
      lead={cardLead}
      onChanged={jest.fn()}
      onOpenTab={onOpenTab}
    />,
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

describe('LeadOverviewDetails — venue', () => {
  it('shows the hero chips, tags, matched user, stat tiles, cards and tracking', async () => {
    serve({ venue });
    render('VENUE_LEAD');
    expect(await screen.findByTestId('lead-overview-details')).toBeOnTheScreen();
    const hero = screen.getByTestId('lead-hero');
    for (const text of [
      'Won',
      'High',
      'Pune',
      'Events',
      'Banquet',
      'Rooftop',
      '+1 more',
      '#corporate',
    ]) {
      expect(within(hero).getByText(text)).toBeOnTheScreen();
    }
    expect(within(hero).getByText('Also a Duncit user · Email match')).toBeOnTheScreen();
    expect(screen.getByTestId('lead-hero-photo')).toBeOnTheScreen();
    expect(screen.getByTestId('stat-tile-capacity')).toHaveTextContent('Capacity20 – 80Indoor', {
      exact: false,
    });
    expect(screen.getByTestId('stat-tile-services')).toHaveTextContent('Services2Catering, DJ', {
      exact: false,
    });
    expect(screen.getByTestId('stat-tile-charges')).toHaveTextContent(
      `Expected charges₹${(5000).toLocaleString()}Deposit ₹${(2000).toLocaleString()}`,
      { exact: false },
    );
    expect(screen.getByTestId('stat-tile-follow-up')).toHaveTextContent(
      'Next follow-up—Assigned to Priya',
      { exact: false },
    );
    const box = screen.getByTestId('matched-user-box');
    expect(within(box).getByText('Asha Rao')).toBeOnTheScreen();
    expect(within(box).getByText('asha@duncit.com · 9800000000')).toBeOnTheScreen();
    expect(within(box).getByTestId('matched-platform-ANDROID-used')).toBeOnTheScreen();
    expect(within(box).getByTestId('matched-platform-IOS-unused')).toBeOnTheScreen();
    expect(screen.getByTestId('matched-user-last-activity')).toHaveTextContent(
      'Last activity: Not recorded yet',
    );
    expect(await within(box).findByText('Verified')).toBeOnTheScreen();
    expect(screen.getByTestId('lead-overview-details')).toHaveTextContent(/A hall by the river/);
    expect(screen.getByText('Sat, Sun')).toBeOnTheScreen();
    const tracking = screen.getByTestId('lead-overview-tracking');
    expect(within(tracking).getByText('Lead tracking')).toBeOnTheScreen();
    expect(within(tracking).getByText('Follow-up')).toBeOnTheScreen();
    expect(within(tracking).getByText('Walk-in')).toBeOnTheScreen();
    expect(within(tracking).getByTestId('lead-overview-note')).toHaveTextContent(
      'REMARKSOwner prefers calls after 6',
    );
    fireEvent.press(screen.getByTestId('lead-map-link'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://maps.app.goo.gl/hall');
  });

  it('opens the Quality Score tab from the ring and checks the matched email again', async () => {
    const onOpenTab = jest.fn();
    serve(
      { venue },
      new Map<unknown, Handler>([
        [
          CrmAppVerifyEmailDocument,
          () => ({
            crmVerifyEmail: {
              email: 'asha@duncit.com',
              status: 'RISKY',
              created_at: '2026-11-25T10:00:00.000Z',
              suggestion: 'asha@duncit.in',
            },
          }),
        ],
      ]),
    );
    render('VENUE_LEAD', onOpenTab);
    const ring = await screen.findByTestId('lead-quality-ring');
    expect(ring).toHaveTextContent('72', { exact: false });
    fireEvent.press(ring);
    expect(onOpenTab).toHaveBeenCalledWith('quality');
    await act(async () => fireEvent.press(await screen.findByTestId('email-status-verified')));
    expect(await screen.findByTestId('email-status-risky')).toHaveTextContent('Risky', {
      exact: false,
    });
  });

  it('calls, opens WhatsApp and opens the composer for the primary contact', async () => {
    serve({ venue });
    render('VENUE_LEAD');
    fireEvent.press(await screen.findByTestId('lead-action-call'));
    expect(mockNav.navigate).toHaveBeenCalledWith('Call', {
      kind: 'VENUE_LEAD',
      id: 'v1',
      to: '9812345678',
      leadName: 'Grand Hall',
      contactName: 'Grand Hall',
    });
    fireEvent.press(screen.getByTestId('lead-action-whatsapp'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/919812345678');
    fireEvent.press(screen.getByTestId('lead-action-email'));
    expect(await screen.findByText('Email · Grand Hall')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('compose-cancel'));
    expect(screen.queryByText('Email · Grand Hall')).toBeNull();
  });

  it('says where to add an address, and turns the actions off without contact details', async () => {
    serve({
      venue: {
        ...venue,
        full_address: '',
        area: null,
        matched_user: null,
        logo_url: null,
        venue_types: [],
        tags: [],
      },
    });
    render('VENUE_LEAD', undefined, { ...lead, city: '', contacts: [] });
    expect(await screen.findByTestId('lead-map-empty')).toHaveTextContent(
      'Add an address to preview the map.',
    );
    expect(screen.queryByTestId('matched-user-box')).toBeNull();
    fireEvent.press(screen.getByTestId('lead-action-call'));
    fireEvent.press(screen.getByTestId('lead-action-whatsapp'));
    expect(mockNav.navigate).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});

describe('LeadOverviewDetails — other kinds', () => {
  it('shows a host lead: type, interests, audience, community and notes', async () => {
    serve({
      host: {
        id: 'v1',
        ...shared,
        profile_photo_url: null,
        host_type: 'Club',
        interests: ['Running', 'Yoga', 'Cycling'],
        matched_user: {
          ...matched,
          matched_on: 'PHONE',
          last_activity_at: '2026-11-20T10:00:00.000Z',
        },
        expected_audience_size: '50-100',
        frequency: null,
        services_offered: [],
        community_size: 400,
        previous_events_hosted: true,
        past_attendees: null,
        organization_name: 'Pune Runners',
        community_link: 'https://chat.whatsapp.com/abc',
        host_intent_scores: ['Hot'],
        notes: 'Wants weekend slots',
      },
    });
    render('HOST_LEAD');
    const hero = await screen.findByTestId('lead-hero');
    expect(within(hero).getByText('Club')).toBeOnTheScreen();
    expect(within(hero).getByText('+1 more')).toBeOnTheScreen();
    expect(within(hero).getByText('Also a Duncit user · Phone match')).toBeOnTheScreen();
    expect(screen.getByTestId('stat-tile-audience')).toHaveTextContent(
      'Audience50-100Frequency not set',
      { exact: false },
    );
    expect(screen.getByTestId('stat-tile-services')).toHaveTextContent('Services0None tagged', {
      exact: false,
    });
    expect(screen.getByTestId('stat-tile-community')).toHaveTextContent(
      'Community400Past events: — attendees',
      { exact: false },
    );
    expect(screen.getByText('Pune Runners')).toBeOnTheScreen();
    expect(screen.getByText('https://chat.whatsapp.com/abc')).toBeOnTheScreen();
    expect(screen.getByTestId('lead-overview-note')).toHaveTextContent('NOTESWants weekend slots');
    expect(screen.getByTestId('matched-user-last-activity')).not.toHaveTextContent(
      /Not recorded yet/,
    );
  });

  it('shows an ecomm lead: brand, catalogue, orders and online presence', async () => {
    serve({
      ecomm: {
        id: 'v1',
        ...shared,
        profile_photo_url: 'https://cdn.duncit.com/p.png',
        brand_name: 'Leaf & Co',
        matched_user: null,
        catalog_size: '120',
        price_range: null,
        services_offered: [],
        monthly_orders: '300',
        fulfilment_mode: 'Self-ship',
        business_type: 'D2C',
        product_categories: ['Tea'],
        gst_number: '27ABCDE1234F1Z5',
        gst_applicable: true,
        instagram_link: null,
        social_links: [{ name: 'Facebook', url: 'https://facebook.com/leaf' }],
        marketplace_links: [],
        notes: null,
      },
    });
    render('ECOMM_LEAD');
    expect(within(await screen.findByTestId('lead-hero')).getByText('Leaf & Co')).toBeOnTheScreen();
    expect(screen.getByTestId('stat-tile-catalogue')).toHaveTextContent(
      'Catalogue120Price range not set',
      { exact: false },
    );
    expect(screen.getByTestId('stat-tile-orders')).toHaveTextContent(
      'Monthly orders300Fulfilment: Self-ship',
      { exact: false },
    );
    expect(screen.getByText('Facebook')).toBeOnTheScreen();
    expect(screen.getByText('27ABCDE1234F1Z5')).toBeOnTheScreen();
    expect(screen.queryByTestId('lead-overview-note')).toBeNull();
  });

  it('shows a creator lead: reach, collaborations and the profile', async () => {
    serve({
      creator: {
        id: 'v1',
        ...shared,
        profile_photo_url: null,
        primary_platform: 'Instagram',
        handle: '@riya',
        niches: ['Fitness'],
        followers_count: 12400,
        engagement_rate: 4.5,
        collaboration_types: ['Reels', 'Stories', 'Events'],
        rate_card: null,
        profile_links: [],
        notes: 'Prefers barter',
      },
    });
    render('CREATOR_LEAD');
    expect(await screen.findByTestId('stat-tile-reach')).toHaveTextContent(
      `Followers${(12400).toLocaleString()}Instagram`,
      { exact: false },
    );
    expect(screen.getByTestId('stat-tile-collab')).toHaveTextContent(
      'Collaboration types3Reels, Stories',
      { exact: false },
    );
    expect(screen.getByText('4.5%')).toBeOnTheScreen();
    const tracking = screen.getByTestId('lead-overview-tracking');
    expect(within(tracking).getByText('Next follow-up')).toBeOnTheScreen();
    expect(within(tracking).getByTestId('lead-overview-note')).toHaveTextContent(
      'NotesPrefers barter',
    );
  });

  it('shows a community lead: members and meetups', async () => {
    serve({
      community: {
        id: 'v1',
        ...shared,
        profile_photo_url: null,
        community_type: 'Running club',
        platform: null,
        member_count: null,
        meetup_frequency: null,
        community_link: null,
        interests: [],
        partnership_interests: ['Venues'],
        notes: null,
      },
    });
    render('COMMUNITY_LEAD');
    expect(await screen.findByTestId('stat-tile-members')).toHaveTextContent(
      'Members—Platform not set',
      { exact: false },
    );
    expect(screen.getByTestId('stat-tile-meetups')).toHaveTextContent(
      'Meetup frequency—No interests added',
      { exact: false },
    );
    expect(within(screen.getByTestId('lead-hero')).getByText('Running club')).toBeOnTheScreen();
    expect(screen.getByText('Venues')).toBeOnTheScreen();
  });

  it('shows "not found" when the lead is gone and the error when the read fails', async () => {
    serve({ host: null });
    const { unmount } = render('HOST_LEAD');
    expect(await screen.findByText('This lead was not found.')).toBeOnTheScreen();
    unmount();
    request.mockRejectedValue(new Error('Server busy'));
    render('VENUE_LEAD');
    expect(await screen.findByText('Server busy')).toBeOnTheScreen();
  });
});
