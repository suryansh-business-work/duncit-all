import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mailCategoryCopy, whatsappCategoryCopy } from '@duncit/app-settings';
import { buildCommPreferenceLabels, type CommChannelState } from '@duncit/utils';

const apollo = vi.hoisted(() => ({ useQuery: vi.fn(), useMutation: vi.fn() }));
vi.mock('@apollo/client/react', () => apollo);

const logError = vi.hoisted(() => vi.fn());
vi.mock('@duncit/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/logs')>()),
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: logError }),
}));

import { fallbackT } from '../src/i18n/fallback';
import { NotificationsTab } from '../src/chrome/ProfilePage/notifications/NotificationsTab';
import {
  MY_COMM_PREFERENCE,
  MY_MAIL_PREFERENCES,
  MY_WHATSAPP_PREFERENCE,
  SET_MY_MAIL_PREFERENCE,
  SET_MY_OTP_CHANNEL,
  SET_MY_WHATSAPP_PREFERENCE,
  type MailPreference,
  type WhatsAppPreference,
} from '../src/chrome/ProfilePage/notifications/queries';

interface QueryResult {
  data?: unknown;
  loading?: boolean;
  error?: Error;
}

const results = new Map<unknown, QueryResult>();
const setMail = vi.fn();
const setWhatsapp = vi.fn();
const setChannel = vi.fn();
const labels = buildCommPreferenceLabels(fallbackT);

const MAIL: MailPreference = {
  email: 'ada@x.test',
  categories: [
    { category: 'marketing', required: false, enabled: true },
    { category: 'authentication', required: true, enabled: true },
  ],
};

const WHATSAPP: WhatsAppPreference = {
  destination: '+91 98765 43210',
  reachable: true,
  categories: [
    { category: 'reminder', required: false, enabled: false },
    { category: 'account', required: true, enabled: true },
  ],
};

const CHANNELS: CommChannelState[] = [
  { channel: 'EMAIL', reachable: true, destination: 'ada@x.test', otp_enabled: true, otp_can_disable: true },
  { channel: 'WHATSAPP', reachable: true, destination: '+91 98765 43210', otp_enabled: true, otp_can_disable: false },
  { channel: 'SMS', reachable: false, destination: '', otp_enabled: false, otp_can_disable: false },
];

function loadAll() {
  results.set(MY_MAIL_PREFERENCES, { data: { myMailPreferences: MAIL } });
  results.set(MY_WHATSAPP_PREFERENCE, { data: { myWhatsappPreference: WHATSAPP } });
  results.set(MY_COMM_PREFERENCE, { data: { myCommunicationPreference: { channels: CHANNELS } } });
}

beforeEach(() => {
  results.clear();
  logError.mockReset();
  setMail.mockReset().mockResolvedValue({});
  setWhatsapp.mockReset().mockResolvedValue({});
  setChannel.mockReset().mockResolvedValue({});
  apollo.useQuery.mockReset().mockImplementation((doc: unknown) => ({
    data: undefined,
    loading: false,
    error: undefined,
    ...results.get(doc),
  }));
  apollo.useMutation.mockReset().mockImplementation((doc: unknown) => {
    if (doc === SET_MY_MAIL_PREFERENCE) return [setMail, { loading: false }];
    if (doc === SET_MY_WHATSAPP_PREFERENCE) return [setWhatsapp, { loading: false }];
    if (doc === SET_MY_OTP_CHANNEL) return [setChannel, { loading: false }];
    return [vi.fn(), { loading: false }];
  });
});

const section = (testId: string) => screen.getByTestId(testId);
const skeletons = (el: HTMLElement) => el.querySelectorAll('.MuiSkeleton-root').length;

describe('NotificationsTab — loading and failure', () => {
  it('shows placeholders in every card while the first load is in flight', () => {
    for (const doc of [MY_MAIL_PREFERENCES, MY_WHATSAPP_PREFERENCE, MY_COMM_PREFERENCE]) {
      results.set(doc, { loading: true });
    }
    render(<NotificationsTab />);

    for (const id of ['profile-mail-preferences', 'profile-whatsapp-preferences', 'profile-otp-channels']) {
      expect(skeletons(section(id))).toBe(2);
      expect(within(section(id)).queryByRole('switch')).not.toBeInTheDocument();
    }
    // No sheet yet, so no address line under the email heading.
    expect(within(section('profile-mail-preferences')).queryByText(/ada@x\.test/)).not.toBeInTheDocument();
  });

  it('keeps showing the cached sheet, without placeholders, while it refreshes', () => {
    loadAll();
    for (const doc of [MY_MAIL_PREFERENCES, MY_WHATSAPP_PREFERENCE, MY_COMM_PREFERENCE]) {
      results.set(doc, { ...results.get(doc), loading: true });
    }
    render(<NotificationsTab />);

    for (const id of ['profile-mail-preferences', 'profile-whatsapp-preferences', 'profile-otp-channels']) {
      expect(skeletons(section(id))).toBe(0);
      expect(within(section(id)).getAllByRole('switch').length).toBeGreaterThan(0);
    }
  });

  it('says each card failed to load when there is nothing cached', () => {
    for (const doc of [MY_MAIL_PREFERENCES, MY_WHATSAPP_PREFERENCE, MY_COMM_PREFERENCE]) {
      results.set(doc, { error: new Error('offline') });
    }
    render(<NotificationsTab />);

    expect(within(section('profile-mail-preferences')).getByText(fallbackT('mailPreference.loadFailed'))).toBeInTheDocument();
    expect(
      within(section('profile-whatsapp-preferences')).getByText(fallbackT('whatsappPreference.loadFailed')),
    ).toBeInTheDocument();
    expect(within(section('profile-otp-channels')).getByText(labels.loadFailed)).toBeInTheDocument();
  });

  it('hides the load failure when a cached sheet is still on screen', () => {
    loadAll();
    for (const doc of [MY_MAIL_PREFERENCES, MY_WHATSAPP_PREFERENCE, MY_COMM_PREFERENCE]) {
      results.set(doc, { ...results.get(doc), error: new Error('refresh failed') });
    }
    render(<NotificationsTab />);

    expect(screen.queryByText(fallbackT('mailPreference.loadFailed'))).not.toBeInTheDocument();
    expect(screen.queryByText(fallbackT('whatsappPreference.loadFailed'))).not.toBeInTheDocument();
    expect(screen.queryByText(labels.loadFailed)).not.toBeInTheDocument();
  });

  it('treats an empty communication preference as not loaded', () => {
    results.set(MY_COMM_PREFERENCE, { data: { myCommunicationPreference: null }, error: new Error('gone') });
    render(<NotificationsTab />);

    const otp = section('profile-otp-channels');
    expect(within(otp).getByText(labels.loadFailed)).toBeInTheDocument();
    expect(within(otp).queryByRole('switch')).not.toBeInTheDocument();
  });
});

describe('MailPreferencesCard', () => {
  const marketing = mailCategoryCopy(fallbackT, 'marketing');
  const authentication = mailCategoryCopy(fallbackT, 'authentication');

  it('lists each category, with required ones locked on and labelled', () => {
    loadAll();
    render(<NotificationsTab />);
    const card = section('profile-mail-preferences');

    expect(within(card).getByText(fallbackT('mailPreference.subtitle', { vars: { email: 'ada@x.test' } }))).toBeInTheDocument();
    const optional = within(card).getByRole('switch', { name: marketing.label });
    expect(optional).toBeChecked();
    expect(optional).toBeEnabled();
    const required = within(card).getByRole('switch', { name: authentication.label });
    expect(required).toBeChecked();
    expect(required).toBeDisabled();
    expect(within(screen.getByTestId('mail-preference-authentication')).getByText(fallbackT('mailPreference.alwaysOn'))).toBeInTheDocument();
    expect(within(screen.getByTestId('mail-preference-marketing')).queryByText(fallbackT('mailPreference.alwaysOn'))).not.toBeInTheDocument();
    // One divider between the two rows, none above the first.
    expect(within(card).getAllByRole('separator')).toHaveLength(1);
  });

  it('saves a switch, shows a spinner on that row meanwhile, then confirms', async () => {
    const u = userEvent.setup();
    let finish: () => void = () => undefined;
    setMail.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    loadAll();
    render(<NotificationsTab />);

    await u.click(screen.getByRole('switch', { name: marketing.label }));
    expect(setMail).toHaveBeenCalledWith({ variables: { category: 'marketing', enabled: false } });
    const row = screen.getByTestId('mail-preference-marketing');
    expect(within(row).getByRole('progressbar', { name: 'Loading…' })).toBeInTheDocument();
    expect(within(screen.getByTestId('mail-preference-authentication')).getByRole('switch')).toBeInTheDocument();

    finish();
    expect(await screen.findByText(fallbackT('mailPreference.saved'))).toBeInTheDocument();
    expect(within(row).getByRole('switch')).toBeInTheDocument();

    // The confirmation dismisses itself, or on Escape.
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByText(fallbackT('mailPreference.saved'))).not.toBeInTheDocument());
  });

  it('says the save failed and logs the error for the row', async () => {
    const u = userEvent.setup();
    const failure = new Error('write refused');
    setMail.mockRejectedValue(failure);
    loadAll();
    render(<NotificationsTab />);

    await u.click(screen.getByRole('switch', { name: marketing.label }));

    expect(
      await within(section('profile-mail-preferences')).findByText(fallbackT('mailPreference.saveFailed')),
    ).toBeInTheDocument();
    expect(logError).toHaveBeenCalledWith('profile', 'mailPreference', { error: failure, key: 'marketing' });
    expect(screen.queryByText(fallbackT('mailPreference.saved'))).not.toBeInTheDocument();
  });
});

describe('WhatsAppPreferencesCard', () => {
  const reminder = whatsappCategoryCopy(fallbackT, 'reminder');

  it('names the number messages go to and saves a switch', async () => {
    const u = userEvent.setup();
    loadAll();
    render(<NotificationsTab />);
    const card = section('profile-whatsapp-preferences');

    expect(
      within(card).getByText(fallbackT('whatsappPreference.subtitle', { vars: { destination: '+91 98765 43210' } })),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('whatsapp-no-number')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('whatsapp-preference-account')).getByText(fallbackT('whatsappPreference.alwaysOn'))).toBeInTheDocument();

    await u.click(within(card).getByRole('switch', { name: reminder.label }));
    expect(setWhatsapp).toHaveBeenCalledWith({ variables: { category: 'reminder', enabled: true } });
    expect(await screen.findByText(fallbackT('whatsappPreference.saved'))).toBeInTheDocument();
  });

  it('shows no subtitle for a reachable sheet with a blank destination', () => {
    results.set(MY_WHATSAPP_PREFERENCE, { data: { myWhatsappPreference: { ...WHATSAPP, destination: '' } } });
    render(<NotificationsTab />);

    const card = section('profile-whatsapp-preferences');
    expect(within(card).queryByText(/\+91/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('whatsapp-no-number')).not.toBeInTheDocument();
  });

  it('explains a missing number but still lets preferences be set ahead of it', () => {
    results.set(MY_WHATSAPP_PREFERENCE, {
      data: { myWhatsappPreference: { ...WHATSAPP, reachable: false } },
    });
    render(<NotificationsTab />);

    const notice = screen.getByTestId('whatsapp-no-number');
    expect(notice).toHaveTextContent(fallbackT('whatsappPreference.noNumberTitle'));
    expect(notice).toHaveTextContent(fallbackT('whatsappPreference.noNumberBody'));
    // Unreachable: the number is not named as where messages go.
    expect(within(section('profile-whatsapp-preferences')).queryByText(/\+91/)).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: reminder.label })).toBeEnabled();
  });

  it('says the save failed and logs it under the WhatsApp scope', async () => {
    const u = userEvent.setup();
    const failure = new Error('nope');
    setWhatsapp.mockRejectedValue(failure);
    loadAll();
    render(<NotificationsTab />);

    await u.click(screen.getByRole('switch', { name: reminder.label }));

    expect(await screen.findByText(fallbackT('whatsappPreference.saveFailed'))).toBeInTheDocument();
    expect(logError).toHaveBeenCalledWith('profile', 'whatsappPreference', { error: failure, key: 'reminder' });
  });
});

describe('OtpChannelsCard', () => {
  it('reads each channel: a normal one, the locked last one and one with no address', () => {
    loadAll();
    render(<NotificationsTab />);
    const card = section('profile-otp-channels');

    expect(within(card).getByText(labels.authBody)).toBeInTheDocument();

    const email = screen.getByTestId('otp-channel-EMAIL');
    expect(within(email).getByText(labels.authSentTo('ada@x.test'))).toBeInTheDocument();
    expect(within(email).getByRole('switch', { name: labels.channel('EMAIL').name })).toBeChecked();
    expect(within(email).getByRole('switch')).toBeEnabled();

    const whatsapp = screen.getByTestId('otp-channel-WHATSAPP');
    expect(within(whatsapp).getByText(labels.authLocked)).toBeInTheDocument();
    expect(within(whatsapp).getByRole('switch')).toBeChecked();
    expect(within(whatsapp).getByRole('switch')).toBeDisabled();

    const sms = screen.getByTestId('otp-channel-SMS');
    expect(within(sms).getByText(labels.channel('SMS').missing)).toBeInTheDocument();
    expect(within(sms).getByRole('switch')).not.toBeChecked();
    expect(within(sms).getByRole('switch')).toBeDisabled();

    // Locked channels carry no "always on" chip — the note says why instead.
    expect(within(card).queryByText(fallbackT('mailPreference.alwaysOn'))).not.toBeInTheDocument();
    expect(within(card).getAllByRole('separator')).toHaveLength(2);
  });

  it('switches a channel off and confirms', async () => {
    const u = userEvent.setup();
    loadAll();
    render(<NotificationsTab />);

    await u.click(screen.getByRole('switch', { name: labels.channel('EMAIL').name }));

    expect(setChannel).toHaveBeenCalledWith({ variables: { channel: 'EMAIL', enabled: false } });
    expect(await screen.findByText(labels.saved)).toBeInTheDocument();
  });

  it('says the save failed and logs it under the OTP scope', async () => {
    const u = userEvent.setup();
    const failure = new Error('last channel');
    setChannel.mockRejectedValue(failure);
    loadAll();
    render(<NotificationsTab />);

    await u.click(screen.getByRole('switch', { name: labels.channel('EMAIL').name }));

    expect(await screen.findByText(labels.saveFailed)).toBeInTheDocument();
    expect(logError).toHaveBeenCalledWith('profile', 'otpChannel', { error: failure, key: 'EMAIL' });
  });
});
