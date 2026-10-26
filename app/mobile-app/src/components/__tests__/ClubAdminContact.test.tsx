import { Linking } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import type { PodAttendanceClubAdmin, PodAttendanceLabels } from '@duncit/utils';

import { AskClubAdminHelp } from '@/components/AskClubAdminHelp';
import { ClubAdminContactRow } from '@/components/create-pod/ClubAdminContactRow';
import type { CreatePodClubDetails } from '@/components/create-pod/useCreatePodClubDetails';
import { ClubAdminHelpCard } from '@/components/attendance/AttendanceNotices/ClubAdminHelpCard';
import { PodHelpSide, usePodClubAdminHelp } from '@/hooks/usePodClubAdminHelp';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/usePodClubAdminHelp', () => ({
  ...jest.requireActual('@/hooks/usePodClubAdminHelp'),
  usePodClubAdminHelp: jest.fn(),
}));

let openURL: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => openURL.mockRestore());

describe('ClubAdminContactRow', () => {
  type Admin = CreatePodClubDetails['club_admins'][number];
  const adminOf = (patch: Record<string, unknown> = {}) =>
    ({
      name: 'Asha Rao',
      avatar_url: 'https://cdn/a.jpg',
      phone: '+91 99999 00000',
      whatsapp: '+91 88888 11111',
      email: 'asha@example.com',
      ...patch,
    }) as unknown as Admin;

  it('shows the name and a tappable line per channel the profile has', () => {
    renderWithProviders(<ClubAdminContactRow admin={adminOf()} />);
    expect(screen.getByText('Asha Rao')).toBeOnTheScreen();
    expect(screen.getByText('+91 99999 00000')).toBeOnTheScreen();
    expect(screen.getByText('+91 88888 11111')).toBeOnTheScreen();
    expect(screen.getByText('asha@example.com')).toBeOnTheScreen();
  });

  it('opens the dialler, WhatsApp and the mail app', () => {
    renderWithProviders(<ClubAdminContactRow admin={adminOf()} />);
    fireEvent.press(screen.getByTestId('club-preview-admin-phone'));
    fireEvent.press(screen.getByTestId('club-preview-admin-whatsapp'));
    fireEvent.press(screen.getByTestId('club-preview-admin-email'));
    expect(openURL).toHaveBeenNthCalledWith(1, 'tel:+91 99999 00000');
    expect(openURL).toHaveBeenNthCalledWith(2, 'https://wa.me/918888811111');
    expect(openURL).toHaveBeenNthCalledWith(3, 'mailto:asha@example.com');
  });

  it('names each line by its channel and value', () => {
    renderWithProviders(<ClubAdminContactRow admin={adminOf()} />);
    expect(screen.getByLabelText('mweb.podPending.phone: +91 99999 00000')).toBeOnTheScreen();
    expect(screen.getByLabelText('mweb.podPending.whatsapp: +91 88888 11111')).toBeOnTheScreen();
    expect(screen.getByLabelText('mweb.podPending.email: asha@example.com')).toBeOnTheScreen();
  });

  it('shows only the channels the profile carries', () => {
    renderWithProviders(<ClubAdminContactRow admin={adminOf({ phone: null, whatsapp: null })} />);
    expect(screen.queryByTestId('club-preview-admin-phone')).toBeNull();
    expect(screen.queryByTestId('club-preview-admin-whatsapp')).toBeNull();
    expect(screen.getByTestId('club-preview-admin-email')).toBeOnTheScreen();
  });

  it('shows no mail line for an admin without an email', () => {
    renderWithProviders(<ClubAdminContactRow admin={adminOf({ email: null })} />);
    expect(screen.queryByTestId('club-preview-admin-email')).toBeNull();
    expect(screen.getByTestId('club-preview-admin-phone')).toBeOnTheScreen();
  });

  it('skips a WhatsApp number that has no digits', () => {
    renderWithProviders(<ClubAdminContactRow admin={adminOf({ whatsapp: 'n/a' })} />);
    expect(screen.queryByTestId('club-preview-admin-whatsapp')).toBeNull();
  });

  it('shows the photo when there is one, and an initial when there is not', () => {
    const { unmount } = renderWithProviders(<ClubAdminContactRow admin={adminOf()} />);
    expect(screen.queryByText('A')).toBeNull();
    unmount();
    renderWithProviders(<ClubAdminContactRow admin={adminOf({ avatar_url: '' })} />);
    expect(screen.getByText('A')).toBeOnTheScreen();
  });

  it('shows a question mark for an admin whose name is missing altogether', () => {
    renderWithProviders(<ClubAdminContactRow admin={adminOf({ avatar_url: '', name: null })} />);
    expect(screen.getByText('?')).toBeOnTheScreen();
  });

  it('shows a question mark for an admin with no name', () => {
    renderWithProviders(<ClubAdminContactRow admin={adminOf({ avatar_url: '', name: '' })} />);
    expect(screen.getByText('?')).toBeOnTheScreen();
  });
});

describe('AskClubAdminHelp', () => {
  const helpMock = jest.mocked(usePodClubAdminHelp);
  const mount = (state: Record<string, unknown> = {}) => {
    const ask = jest.fn();
    helpMock.mockReturnValue({
      ask,
      loading: false,
      outcome: null,
      ...state,
    } as unknown as ReturnType<typeof usePodClubAdminHelp>);
    renderWithProviders(
      <AskClubAdminHelp podId="p1" side={PodHelpSide.Host} label="Ask for help" />,
    );
    return ask;
  };

  it('asks for the pod and side, with the caller label on the button', () => {
    const ask = mount();
    expect(helpMock).toHaveBeenCalledWith('p1', PodHelpSide.Host);
    expect(screen.getByLabelText('Ask for help')).toBeOnTheScreen();
    expect(screen.queryByTestId('ask-club-admin-help-outcome')).toBeNull();
    fireEvent.press(screen.getByTestId('ask-club-admin-help-button'));
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('shows the sending label while the ask is in flight', () => {
    mount({ loading: true });
    expect(screen.getByLabelText('mweb.podClubAdmin.askHelpSending')).toBeOnTheScreen();
  });

  it('says how it went and drops the button once there is nothing left to press', () => {
    mount({ outcome: { key: 'mweb.podClubAdmin.askHelpSent', color: '$success', retry: false } });
    expect(screen.getByTestId('ask-club-admin-help-outcome')).toHaveTextContent(
      'mweb.podClubAdmin.askHelpSent',
    );
    expect(screen.queryByTestId('ask-club-admin-help-button')).toBeNull();
  });

  it('keeps the button after a failure so it can be retried', () => {
    mount({ outcome: { key: 'mweb.podClubAdmin.askHelpFailed', color: '$danger', retry: true } });
    expect(screen.getByTestId('ask-club-admin-help-outcome')).toHaveTextContent(
      'mweb.podClubAdmin.askHelpFailed',
    );
    expect(screen.getByTestId('ask-club-admin-help-button')).toBeOnTheScreen();
  });
});

describe('ClubAdminHelpCard', () => {
  const labels = {
    clubAdminTitle: 'Need help?',
    clubAdminBody: 'Ask the club admin',
    clubAdminNone: 'No club admin',
    contactEmail: 'Email',
    contactPhone: 'Call',
    contactWhatsapp: 'WhatsApp',
  } as unknown as PodAttendanceLabels;

  const admin = (
    id: string,
    patch: Partial<PodAttendanceClubAdmin> = {},
  ): PodAttendanceClubAdmin => ({
    id,
    name: `Admin ${id}`,
    avatar_url: '',
    email: `${id}@x.com`,
    phone: '+91 99999-00000',
    whatsapp: '+91 88888 11111',
    ...patch,
  });

  it('explains who to ask and lists each admin', () => {
    renderWithProviders(<ClubAdminHelpCard admins={[admin('a1'), admin('a2')]} labels={labels} />);
    expect(screen.getByText('Need help?')).toBeOnTheScreen();
    expect(screen.getByText('Ask the club admin')).toBeOnTheScreen();
    expect(screen.getByText('Admin a1')).toBeOnTheScreen();
    expect(screen.getByText('Admin a2')).toBeOnTheScreen();
    expect(screen.queryByText('No club admin')).toBeNull();
  });

  it('says there is no club admin', () => {
    renderWithProviders(<ClubAdminHelpCard admins={[]} labels={labels} />);
    expect(screen.getByText('No club admin')).toBeOnTheScreen();
  });

  it('opens mail, the dialler (digits and plus only) and WhatsApp', async () => {
    renderWithProviders(<ClubAdminHelpCard admins={[admin('a1')]} labels={labels} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Email'));
      fireEvent.press(screen.getByLabelText('Call'));
      fireEvent.press(screen.getByLabelText('WhatsApp'));
    });
    expect(openURL).toHaveBeenNthCalledWith(1, 'mailto:a1@x.com');
    expect(openURL).toHaveBeenNthCalledWith(2, 'tel:+919999900000');
    expect(openURL).toHaveBeenNthCalledWith(3, 'https://wa.me/918888811111');
  });

  it('offers only the channels an admin has', () => {
    renderWithProviders(
      <ClubAdminHelpCard
        admins={[admin('a1', { email: '', phone: '', whatsapp: '' })]}
        labels={labels}
      />,
    );
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(screen.queryByLabelText('Call')).toBeNull();
    expect(screen.queryByLabelText('WhatsApp')).toBeNull();
  });

  it('does not crash when the phone app cannot open the link', async () => {
    openURL.mockRejectedValue(new Error('no handler'));
    renderWithProviders(<ClubAdminHelpCard admins={[admin('a1')]} labels={labels} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Call'));
    });
    expect(screen.getByLabelText('Call')).toBeOnTheScreen();
  });
});
