import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { dialNumber } from '@/services/dialer';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import type { Lead, LeadContact } from '@/features/leads/useLead';
import { ContactRow } from '../lead/ContactRow';
import { LeadOverview } from '../lead/LeadOverview';
import { LeadReminders } from '../lead/LeadReminders';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
// ReminderRow opens the lead from a reminder; no navigator is mounted here.
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('@/services/dialer', () => ({
  dialNumber: jest.fn(),
  whatsappUrl: (raw: string) => `https://wa.me/${raw.replace(/\D/g, '')}`,
}));

const request = gqlRequest as jest.Mock;
const dial = dialNumber as jest.Mock;

const contact = (over: Partial<LeadContact> = {}): LeadContact => ({
  name: 'Rohit',
  role: 'Owner',
  mobile_number: '98110 00001',
  whatsapp_number: null,
  email: null,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

describe('ContactRow', () => {
  it('opens the call screen for the number and the contact, without dialling from here', () => {
    const onCall = jest.fn();
    renderWithTheme(<ContactRow contact={contact()} index={0} onCall={onCall} />);
    fireEvent.press(screen.getByTestId('contact-call-0'));
    expect(onCall).toHaveBeenCalledWith('98110 00001', 'Rohit');
    expect(dial).not.toHaveBeenCalled();
  });

  it('calls the WhatsApp number when there is no mobile, and leaves an unnamed contact unnamed', () => {
    const onCall = jest.fn();
    renderWithTheme(
      <ContactRow
        contact={contact({ name: '', mobile_number: null, whatsapp_number: '98110 00002' })}
        index={1}
        onCall={onCall}
      />,
    );
    fireEvent.press(screen.getByTestId('contact-call-1'));
    expect(onCall).toHaveBeenCalledWith('98110 00002', undefined);
  });

  it('opens WhatsApp on the mobile number when there is no WhatsApp number, and email', () => {
    renderWithTheme(
      <ContactRow contact={contact({ email: 'r@cafe.in' })} index={2} onCall={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('contact-whatsapp-2'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/9811000001');
    fireEvent.press(screen.getByTestId('contact-email-2'));
    expect(Linking.openURL).toHaveBeenCalledWith('mailto:r@cafe.in');
  });

  it('offers no call or WhatsApp without a number, and names an unnamed contact', () => {
    renderWithTheme(
      <ContactRow
        contact={contact({ name: '', mobile_number: null, email: 'x@y.in' })}
        index={0}
        onCall={jest.fn()}
      />,
    );
    expect(screen.getByText('Contact')).toBeOnTheScreen();
    expect(screen.queryByTestId('contact-call-0')).toBeNull();
    expect(screen.queryByTestId('contact-whatsapp-0')).toBeNull();
  });
});

describe('LeadOverview', () => {
  it('shows a dash for missing facts and says when there are no contacts', () => {
    const lead = {
      name: 'Run Club',
      lead_status: 'New',
      priority: null,
      city: '',
      assigned_to: null,
      next_follow_up_date: null,
      contacts: [],
      activity_log: [],
    } as unknown as Lead;
    renderWithTheme(
      <LeadOverview
        lead={lead}
        onAddNote={jest.fn()}
        onAddReminder={jest.fn()}
        onCall={jest.fn()}
      />,
    );
    expect(screen.getByText('No contacts on this lead.')).toBeOnTheScreen();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });
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
