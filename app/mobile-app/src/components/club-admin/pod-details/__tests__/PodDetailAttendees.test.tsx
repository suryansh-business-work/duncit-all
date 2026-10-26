import { screen } from '@testing-library/react-native';

import type { ClubPodAttendee } from '@/hooks/useClubPodDetail';
import { renderWithProviders } from '@/utils/test-utils';
import { PodDetailAttendees } from '../PodDetailAttendees';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDateTime: (value: string) => `at ${value}` }),
}));

const K = 'podDetailsPanel.podAttendeesSection.';
const PAST = '2020-01-01T10:00:00.000Z';

const attendee = (patch: Record<string, unknown> = {}) =>
  ({
    member_id: 'm1',
    user_id: 'u1',
    full_name: 'Asha Rao',
    profile_photo: null,
    email: 'asha@example.com',
    phone: '+91 99999 00000',
    seats: 2,
    status: 'JOINED',
    is_host: false,
    joined_at: '2026-10-01T09:00:00.000Z',
    replaced_by_name: null,
    participation: null,
    ...patch,
  }) as unknown as ClubPodAttendee;

const mount = (rows: ClubPodAttendee[], isLoading = false) =>
  renderWithProviders(<PodDetailAttendees rows={rows} podDateTime={PAST} isLoading={isLoading} />);

describe('PodDetailAttendees', () => {
  it('shows the section with a count and one line per person', () => {
    mount([attendee(), attendee({ member_id: 'm2', user_id: 'u2', full_name: 'Bo Singh' })]);
    expect(screen.getByRole('heading', { name: `${K}attendees` })).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    expect(screen.getByText('Asha Rao')).toBeOnTheScreen();
    expect(screen.getByText('Bo Singh')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-detail-attendee-m1')).toBeOnTheScreen();
  });

  it('shows contact, seats and when they joined', () => {
    mount([attendee()]);
    expect(screen.getByText('asha@example.com · +91 99999 00000')).toBeOnTheScreen();
    expect(screen.getByText(`${K}seats: 2 · at 2026-10-01T09:00:00.000Z`)).toBeOnTheScreen();
  });

  it('shows the status of the booking', () => {
    mount([attendee()]);
    expect(screen.getByTestId('club-pod-detail-attendee-m1-status')).toHaveTextContent(
      `${K}statusJoined`,
    );
  });

  it('shows only the contact details that exist', () => {
    mount([
      attendee({ email: null }),
      attendee({ member_id: 'm2', user_id: 'u2', phone: null, email: 'b@x.com' }),
    ]);
    expect(screen.getByText('+91 99999 00000')).toBeOnTheScreen();
    expect(screen.getByText('b@x.com')).toBeOnTheScreen();
  });

  it('shows no contact line for a person with no email or phone', () => {
    mount([attendee({ email: null, phone: null })]);
    expect(screen.queryByText(/·.*\+91/)).toBeNull();
    expect(screen.getByText(/^podDetailsPanel.podAttendeesSection.seats: 2/)).toBeOnTheScreen();
  });

  it('shows only the seats when the join time is unknown', () => {
    mount([attendee({ joined_at: null })]);
    expect(screen.getByText(`${K}seats: 2`)).toBeOnTheScreen();
  });

  it('strikes through a member who backed out', () => {
    mount([attendee({ status: 'BACKED_OUT' })]);
    expect(screen.UNSAFE_getByProps({ children: 'Asha Rao' }).props.textDecorationLine).toBe(
      'line-through',
    );
    expect(screen.getByTestId('club-pod-detail-attendee-m1-status')).toHaveTextContent(
      `${K}statusBackedOut`,
    );
  });

  it('does not strike through a member who is in', () => {
    mount([attendee()]);
    expect(screen.UNSAFE_getByProps({ children: 'Asha Rao' }).props.textDecorationLine).toBe(
      'none',
    );
  });

  it('says who filled the spot of a member who backed out', () => {
    mount([attendee({ status: 'BACKED_OUT', replaced_by_name: 'Chitra' })]);
    expect(screen.getByTestId('club-pod-detail-attendee-m1-replaced')).toHaveTextContent(
      `${K}spotFilledBy|Chitra`,
    );
  });

  it('identifies a row by user when it has no member record', () => {
    mount([attendee({ member_id: null, user_id: 'u7' })]);
    expect(screen.getByTestId('club-pod-detail-attendee-u7')).toBeOnTheScreen();
  });

  it('copes with a person whose name is missing', () => {
    mount([attendee({ full_name: null })]);
    expect(screen.getByTestId('club-pod-detail-attendee-m1')).toBeOnTheScreen();
  });

  it('says nobody joined once loaded with no rows', () => {
    mount([]);
    expect(screen.getByTestId('club-pod-detail-attendees-empty')).toHaveTextContent(
      `${K}nobodyJoined`,
    );
    expect(screen.queryByTestId('club-pod-detail-attendees-loading')).toBeNull();
  });

  it('shows a spinner, not the empty sentence, while the first load is running', () => {
    mount([], true);
    expect(screen.getByTestId('club-pod-detail-attendees-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-pod-detail-attendees-empty')).toBeNull();
  });

  it('keeps showing rows without a spinner while a reload runs', () => {
    mount([attendee()], true);
    expect(screen.queryByTestId('club-pod-detail-attendees-loading')).toBeNull();
    expect(screen.getByText('Asha Rao')).toBeOnTheScreen();
  });
});
