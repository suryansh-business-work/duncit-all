import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CrmAppQualityAnalyticsDocument } from '@/graphql/leadQuality';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { QualityAnalyticsScreen } from '../quality-analytics/QualityAnalyticsScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNav }));

const request = gqlRequest as jest.Mock;
const typeStats = (entity_type: string, over: object = {}) => ({
  entity_type,
  total: 4,
  scored: 3,
  average_score: 72.46,
  qualified: 2,
  not_qualified: 1,
  pending_verification: 1,
  failed_gate_leads: 0,
  pending_items: 5,
  classifications: [{ key: 'hot', label: 'Hot', count: 2 }],
  distribution: [{ key: '70', label: '70–100', count: 2 }],
  ...over,
});
const ANALYTICS = {
  generated_at: '2026-11-25T10:00:00.000Z',
  duplicate_leads: 3,
  by_type: [
    typeStats('VENUE_LEAD'),
    typeStats('HOST_LEAD', { distribution: [{ key: '70', label: '70–100', count: 1 }] }),
  ],
  top_leads: [
    {
      entity_type: 'HOST_LEAD',
      id: 'h1',
      name: 'Run Club',
      city: 'Pune',
      score: 64,
      classification_label: 'Warm',
      qualification: 'PENDING_VERIFICATION',
    },
    {
      entity_type: 'VENUE_LEAD',
      id: 'v1',
      name: 'Smash Arena',
      city: 'Pune',
      score: 91,
      classification_label: 'Hot',
      qualification: 'QUALIFIED',
    },
  ],
  cities: [{ city: 'Pune', leads: 2, average_score: 77.5, qualified: 1 }],
  trend: [{ week: '2026-W45', leads: 2, average_score: 70 }],
  conversion: [{ classification: 'hot', label: 'Hot', leads: 2, won: 1, conversion_rate: 50 }],
  origins: [{ origin: 'RESEARCH', leads: 2, average_score: 80, qualified: 1 }],
  missing_evidence: [{ entity_type: 'VENUE_LEAD', criterion: 'Website live', leads: 2 }],
  research_queue: [
    { key: 'NEW', label: 'New', count: 4, average_score: 55 },
    { key: 'ADDED', label: 'Added', count: 0, average_score: null },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  request.mockResolvedValue({ crmLeadQualityAnalytics: ANALYTICS });
});

describe('QualityAnalyticsScreen', () => {
  it('shows every lead type with its average score and qualification counts', async () => {
    renderWithTheme(<QualityAnalyticsScreen />);
    expect(await screen.findByTestId('type-card-VENUE_LEAD')).toBeOnTheScreen();
    expect(request.mock.calls[0]?.[0]).toBe(CrmAppQualityAnalyticsDocument);
    expect(request.mock.calls[0]?.[1]).toEqual({ entity_type: null });
    expect(screen.getAllByLabelText('Average score: 72.5')).toHaveLength(2);
    expect(screen.getAllByText('3 of 4 scored')).toHaveLength(2);
    expect(screen.getByTestId('stat-VENUE_LEAD-pending-items')).toHaveProp(
      'aria-label',
      'Items to verify: 5',
    );
  });

  it('adds score buckets across types, lists top leads highest first, and opens one', async () => {
    renderWithTheme(<QualityAnalyticsScreen />);
    expect(await screen.findByLabelText('70–100: 3')).toBeOnTheScreen();
    expect(screen.getByText('Smash Arena')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('top-leads-VENUE_LEAD:v1'));
    expect(mockNav.navigate).toHaveBeenCalledWith('LeadDetail', { kind: 'VENUE_LEAD', id: 'v1' });
    // The top lead's qualification is worded, never the raw enum.
    expect(screen.getByText(/Warm · Pending verification/)).toBeOnTheScreen();
    expect(screen.getByTestId('research-queue-NEW')).toBeOnTheScreen();
    expect(screen.queryByTestId('research-queue-ADDED')).toBeNull();
    expect(screen.getByTestId('stat-duplicate-leads')).toHaveProp(
      'aria-label',
      'Duplicate CRM leads: 3',
    );
    expect(screen.getByText('Website live')).toBeOnTheScreen();
  });

  it('asks the server for one type when it is picked, and says when it has nothing to analyse', async () => {
    renderWithTheme(<QualityAnalyticsScreen />);
    await screen.findByTestId('type-card-VENUE_LEAD');
    request.mockResolvedValue({
      crmLeadQualityAnalytics: {
        ...ANALYTICS,
        by_type: [typeStats('ECOMM_LEAD', { total: 0 })],
        research_queue: [],
      },
    });
    fireEvent.press(screen.getByTestId('analytics-type-ECOMM_LEAD'));
    expect(await screen.findByTestId('analytics-empty')).toBeOnTheScreen();
    await waitFor(() =>
      expect(request.mock.calls.at(-1)?.[1]).toEqual({ entity_type: 'ECOMM_LEAD' }),
    );
  });

  it('shows why it could not load, and retries', async () => {
    request.mockRejectedValueOnce(new Error('Access Denied'));
    renderWithTheme(<QualityAnalyticsScreen />);
    expect(await screen.findByText('Access Denied')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(await screen.findByTestId('type-card-HOST_LEAD')).toBeOnTheScreen();
  });
});
