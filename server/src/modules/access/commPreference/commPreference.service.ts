import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { hasOtpTransport } from '@modules/platform/otp/otp.delivery';

/**
 * Which channels an account will accept a one-time code on.
 *
 * A different question from Mail Preference and WhatsApp Preference, which
 * answer "do you want to hear from us" and are keyed on an address or a number
 * that need not belong to an account at all. This one answers "how do you
 * prove it is you", so it lives on the user document and every send path can
 * read it without a second lookup.
 *
 * The rule the whole file exists for: at least one channel that can actually
 * DELIVER a code must stay on. Three things have to be true of it, and the
 * guard was wrong until it checked all three:
 *  - the switch is on;
 *  - we hold an address or number for it — WhatsApp cannot be somebody's
 *    remaining channel when they never gave us a WhatsApp number;
 *  - a transport exists behind it. SMS and WhatsApp are STUBBED today
 *    (`hasOtpTransport`), so counting them would let an account switch off
 *    email codes and be left with two channels that deliver nothing — the
 *    exact lockout this guard exists to prevent, passing its own check.
 *
 * `reachable` on the row still means only "we hold an address", because that
 * is what the screen renders an "add your number" state from. Deliverability
 * is the stricter question and only the guard asks it. Wiring a provider
 * frees the switch on its own, with no edit here.
 */

export const COMM_CHANNELS = ['EMAIL', 'WHATSAPP', 'SMS'] as const;
export type CommChannel = (typeof COMM_CHANNELS)[number];

/** Channel to the `communication.otp_channels` key that stores its switch. */
const FIELD: Record<CommChannel, 'email' | 'whatsapp' | 'sms'> = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
};

export interface CommChannelPreference {
  channel: CommChannel;
  reachable: boolean;
  destination: string;
  otp_enabled: boolean;
  otp_can_disable: boolean;
}

export interface CommPreferenceSheet {
  channels: CommChannelPreference[];
  updated_at: string | null;
}

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const trimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Where each channel would actually deliver, or '' when it could not. */
function destinationsOf(user: any): Record<CommChannel, string> {
  const phone = user?.auth?.phone ?? {};
  const wa = user?.communication?.whatsapp ?? {};
  const phoneNumber = trimmed(phone.number);
  const phoneLine = phoneNumber ? `${trimmed(phone.extension)} ${phoneNumber}`.trim() : '';
  const waNumber = trimmed(wa.number);
  const waLine = waNumber ? `${trimmed(wa.extension)} ${waNumber}`.trim() : '';
  return {
    EMAIL: trimmed(user?.auth?.email),
    // Somebody who never filled the WhatsApp box is still reachable there on
    // the number they signed up with — the same fallback the campaign
    // recipient picker uses.
    WHATSAPP: waLine || phoneLine,
    SMS: phoneLine,
  };
}

/**
 * Could a code actually arrive on this channel, given what is wired?
 *
 * EMAIL is the platform transport and the only one the sign-in, password-reset
 * and account-deletion codes use at all. The two phone mediums defer to
 * `hasOtpTransport`, which lives next to the branch that would wire them.
 */
const deliverable = (channel: CommChannel): boolean =>
  channel === 'EMAIL' || hasOtpTransport(channel);

/** Stored switches, defaulting to on for a document written before the field. */
function switchesOf(user: any): Record<CommChannel, boolean> {
  const stored = user?.communication?.otp_channels ?? {};
  return {
    EMAIL: stored.email !== false,
    WHATSAPP: stored.whatsapp !== false,
    SMS: stored.sms !== false,
  };
}

/** The sheet both apps render, and the guard every write is checked against. */
function sheetFrom(user: any): CommPreferenceSheet {
  const destinations = destinationsOf(user);
  const switches = switchesOf(user);
  const live = COMM_CHANNELS.filter(
    (channel) => switches[channel] && destinations[channel].length > 0 && deliverable(channel)
  );
  const channels = COMM_CHANNELS.map((channel) => {
    const enabled = switches[channel];
    return {
      channel,
      reachable: destinations[channel].length > 0,
      destination: destinations[channel],
      otp_enabled: enabled,
      // Switching this one off is allowed only while something else would
      // still be able to carry a code.
      otp_can_disable: enabled && live.some((other) => other !== channel),
    };
  });
  const updatedAt = user?.communication?.otp_channels_updated_at ?? null;
  return { channels, updated_at: updatedAt ? new Date(updatedAt).toISOString() : null };
}

const SELECTION = 'auth.email auth.phone communication';

async function loadUser(userId: string) {
  const user = await UserModel.findById(userId).select(SELECTION).lean();
  if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
  return user;
}

export const commPreferenceService = {
  async sheet(userId: string): Promise<CommPreferenceSheet> {
    return sheetFrom(await loadUser(userId));
  },

  /** Flip one channel's code switch, refusing the flip that locks the account out. */
  async setOtpChannel(
    userId: string,
    channel: string,
    enabled: boolean
  ): Promise<CommPreferenceSheet> {
    if (!COMM_CHANNELS.includes(channel as CommChannel)) {
      throw badInput('Unknown channel');
    }
    const typed = channel as CommChannel;
    const user = await loadUser(userId);
    const row = sheetFrom(user).channels.find((c) => c.channel === typed);
    // Turning ON is never blocked; turning OFF is, when this is the last one
    // that could still carry a code.
    if (!enabled && row?.otp_enabled && !row.otp_can_disable) {
      throw badInput('You need one-time codes on at least one channel you can be reached on.');
    }
    const updated = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          [`communication.otp_channels.${FIELD[typed]}`]: enabled,
          'communication.otp_channels_updated_at': new Date(),
        },
      },
      { new: true }
    )
      .select(SELECTION)
      .lean();
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return sheetFrom(updated);
  },

  /**
   * May a one-time code go out by email to this address?
   *
   * Never throws and defaults to YES. A code that fails to send because a
   * preference lookup broke is somebody unable to sign in, which is strictly
   * worse than one extra message — the same reasoning as
   * `mailPreferenceService.allows`.
   */
  async allowsEmailOtp(email: string): Promise<boolean> {
    const address = trimmed(email).toLowerCase();
    if (!address) return true;
    try {
      const user = await UserModel.findOne({ 'auth.email': address })
        .select('communication.otp_channels')
        .lean();
      return (user as any)?.communication?.otp_channels?.email !== false;
    } catch (error) {
      logs.server.warn('commPreference', 'allowsEmailOtp', { error });
      return true;
    }
  },

  /**
   * The mediums a phone code may actually use, given who owns the number.
   *
   * The preference belongs to whoever owns the NUMBER being messaged, not to
   * whoever asked for the code — at a pod door the host requests it and the
   * attendee receives it. A number with no account behind it has no preference
   * to honour, so every requested medium survives.
   */
  async allowedPhoneMediums(
    phoneNumber: string,
    requested: readonly string[]
  ): Promise<string[]> {
    const digits = trimmed(phoneNumber);
    if (!digits) return [...requested];
    try {
      const user = await UserModel.findOne({
        $or: [{ 'auth.phone.number': digits }, { 'communication.whatsapp.number': digits }],
      })
        .select('communication.otp_channels')
        .lean();
      if (!user) return [...requested];
      const stored = (user as any).communication?.otp_channels ?? {};
      return requested.filter((medium) => {
        if (medium === 'SMS') return stored.sms !== false;
        if (medium === 'WHATSAPP') return stored.whatsapp !== false;
        return true;
      });
    } catch (error) {
      logs.server.warn('commPreference', 'allowedPhoneMediums', { error });
      return [...requested];
    }
  },
};
