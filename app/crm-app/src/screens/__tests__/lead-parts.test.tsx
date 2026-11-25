import { fireEvent, screen } from '@testing-library/react-native';

import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { LeadReminders } from '../lead/LeadReminders';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
// ReminderRow opens the lead from a reminder; no navigator is mounted here.
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));

const request = gqlRequest as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LeadReminders', () => {
  const reminder = (id: string, title: string, due_at: string) => ({
    id,
    entity_type: 'VENUE_LEAD',
    lead_id: 'v1',
    title,
    due_at,
    notes: null,
    status: 'PENDING',
  });

  it('lists this lead’s reminders, soonest first, asking only for this lead', async () => {
    request.mockResolvedValue({
      crmReminders: [
        reminder('r2', 'Second visit', '2026-12-10T10:00:00.000Z'),
        reminder('r1', 'First call', '2026-12-01T10:00:00.000Z'),
      ],
    });
    renderWithTheme(<LeadReminders kind="VENUE_LEAD" id="v1" />);
    expect(await screen.findByText('First call')).toBeOnTheScreen();
    const titles = screen.getAllByText(/First call|Second visit/).map((n) => n.props.children);
    expect(titles).toEqual(['First call', 'Second visit']);
    expect(request.mock.calls[0]?.[1]).toEqual({
      filter: { entity_type: 'VENUE_LEAD', lead_id: 'v1' },
    });
  });

  it('says when there are none, and offers a retry when they could not load', async () => {
    request.mockResolvedValueOnce({ crmReminders: [] });
    const { unmount } = renderWithTheme(<LeadReminders kind="HOST_LEAD" id="h1" />);
    expect(await screen.findByText('No reminders.')).toBeOnTheScreen();
    unmount();
    request.mockRejectedValueOnce(new Error('offline'));
    renderWithTheme(<LeadReminders kind="HOST_LEAD" id="h1" />);
    expect(await screen.findByText('offline')).toBeOnTheScreen();
    request.mockResolvedValueOnce({
      crmReminders: [reminder('r9', 'Back online', '2026-12-02T10:00:00.000Z')],
    });
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(await screen.findByText('Back online')).toBeOnTheScreen();
  });
});
