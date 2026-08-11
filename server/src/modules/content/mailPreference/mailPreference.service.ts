import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { currentEmailSource } from '@modules/content/emailLog/emailLog.service';
import {
  MAIL_PREFERENCE_CATEGORIES,
  OPTIONAL_MAIL_CATEGORIES,
  isMailPreferenceCategory,
  isOptionalMailCategory,
} from './mailPreference.categories';
import { MailPreferenceEventModel, MailPreferenceModel } from './mailPreference.model';

/**
 * Who has asked not to hear from us, and about what.
 *
 * Two callers, and they want opposite things. The screens ask "what may I show
 * and change?" and get the full nine-row answer. The send path asks "may I send
 * this one email?" and must get an answer that costs nothing — so `allows` and
 * `allowedRecipients` short-circuit on the category BEFORE touching Mongo, and a
 * receipt or an OTP never reads a document at all.
 */

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const normalise = (email: string): string => email.trim().toLowerCase();

/** One category as the API returns it. The LABEL is the client's job: the copy
 * is localized (rule 38), and the server has no business shipping English. */
const category = (key: string, optedOut: Set<string>) => ({
  category: key,
  required: !isOptionalMailCategory(key),
  // A required category always reads as on, whatever a stale row says.
  enabled: !optedOut.has(key) || !isOptionalMailCategory(key),
});

/** The whole preference sheet for one address. */
const sheet = (email: string, doc: { opted_out?: string[]; updated_at?: Date } | null) => {
  const optedOut = new Set(doc?.opted_out ?? []);
  return {
    email,
    categories: MAIL_PREFERENCE_CATEGORIES.map((key) => category(key, optedOut)),
    updated_at: doc?.updated_at?.toISOString() ?? null,
  };
};

/**
 * Which of these addresses have switched this category off.
 *
 * Empty on any failure, which lets the batch through — see {@link
 * mailPreferenceService.allows} for why the send path must not throw here.
 */
async function optedOutAmong(emails: string[], mailCategory: string): Promise<Set<string>> {
  try {
    const docs = await MailPreferenceModel.find({
      email: { $in: emails.map(normalise) },
      opted_out: mailCategory,
    })
      .select('email')
      .lean();
    return new Set(docs.map((doc) => doc.email));
  } catch (error) {
    logs.server.warn('mailPreference', 'allowedRecipients', { error, mailCategory });
    return new Set();
  }
}

/** The account behind an address, when there is one. */
async function userIdFor(email: string): Promise<string | null> {
  const user = await UserModel.findOne({ 'auth.email': email }).select('_id').lean();
  return user ? String(user._id) : null;
}

/**
 * Tell the person what just changed, from the address they will reply to.
 *
 * Fire-and-forget and imported late: the confirmation is itself an email, and
 * `email.service` reads this module to decide whether it may send — a static
 * import would close that circle at module load. `transactional` is why the
 * confirmation always arrives: it is a record of something they did, and it is
 * not a category anyone can switch off.
 */
function confirmByEmail(email: string): void {
  import('@services/email/email.service')
    .then(({ sendUnsubscribeConfirmationEmail }) =>
      sendUnsubscribeConfirmationEmail({ to: email })
    )
    .catch((error) => logs.server.warn('mailPreference', 'confirm', { error, email }));
}

export const mailPreferenceService = {
  /**
   * May we send this one email?
   *
   * The category test comes first and answers most calls without a query — only
   * the four opt-out-able categories ever reach the database.
   *
   * NEVER throws. It is called from `sendEmail` before that function's own
   * try/catch, and `sendEmail` promises its callers it does not throw — a
   * password reset that failed as a GraphQL error AFTER the OTP was stored is a
   * bug this codebase has already had once. An unreadable preference lets the
   * email through: nobody's booking confirmation should be lost to a database
   * blip in the opt-out check.
   */
  async allows(email: string, mailCategory: string): Promise<boolean> {
    if (!isOptionalMailCategory(mailCategory)) return true;
    const address = normalise(email);
    if (!address) return true;
    try {
      const doc = await MailPreferenceModel.findOne({ email: address })
        .select('opted_out')
        .lean();
      return !doc?.opted_out?.includes(mailCategory);
    } catch (error) {
      logs.server.warn('mailPreference', 'allows', { error, email: address, mailCategory });
      return true;
    }
  },

  /**
   * The subset of a batch that still wants this category.
   *
   * One `$in` query for the whole batch rather than one per address: a campaign
   * goes out in batches of fifty, and fifty round trips per batch is how a
   * preference check becomes the slowest part of sending. Non-throwing for the
   * same reason as {@link allows}.
   */
  async allowedRecipients(
    emails: string[],
    mailCategory: string
  ): Promise<{ allowed: string[]; suppressed: string[] }> {
    if (!isOptionalMailCategory(mailCategory) || emails.length === 0) {
      return { allowed: emails, suppressed: [] };
    }
    const out = await optedOutAmong(emails, mailCategory);
    const allowed: string[] = [];
    const suppressed: string[] = [];
    for (const address of emails) {
      if (out.has(normalise(address))) suppressed.push(address);
      else allowed.push(address);
    }
    return { allowed, suppressed };
  },

  /** What one address currently receives. */
  async forEmail(email: string) {
    const address = normalise(email);
    const doc = await MailPreferenceModel.findOne({ email: address }).lean();
    return sheet(address, doc);
  },

  /**
   * Switch one category on or off, and keep the change.
   *
   * The event row is written whether or not the state moved, because "they
   * clicked unsubscribe again" is a fact worth having; the preference document
   * is idempotent either way.
   */
  async set(input: { email: string; category: string; enabled: boolean }) {
    const address = normalise(input.email);
    if (!address) throw badInput('An email address is required');
    if (!isMailPreferenceCategory(input.category)) {
      throw badInput(`"${input.category}" is not a mail category`);
    }
    if (!isOptionalMailCategory(input.category)) {
      throw badInput(
        `${input.category} email cannot be switched off — it carries codes, receipts or notices we have to send.`
      );
    }
    // Named, not `this.apply` — a resolver that destructured this service would
    // otherwise call a method whose `this` is undefined.
    return mailPreferenceService.apply(address, [input.category], input.enabled);
  },

  /** Stop (or restart) everything that can be stopped, in one action. */
  async setAll(input: { email: string; enabled: boolean }) {
    const address = normalise(input.email);
    if (!address) throw badInput('An email address is required');
    return mailPreferenceService.apply(address, [...OPTIONAL_MAIL_CATEGORIES], input.enabled);
  },

  /**
   * The single write path both mutations share.
   *
   * Upserted rather than read-modify-written: two devices toggling at once would
   * otherwise last-write-wins the whole array and silently restore a category
   * the other one just switched off.
   */
  async apply(email: string, categories: string[], enabled: boolean) {
    const surface = currentEmailSource();
    const change = enabled
      ? { $pullAll: { opted_out: categories } }
      : { $addToSet: { opted_out: { $each: categories } } };
    const userId = await userIdFor(email);

    const doc = await MailPreferenceModel.findOneAndUpdate(
      { email },
      { ...change, $set: { user_id: userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    await MailPreferenceEventModel.insertMany(
      categories.map((mailCategory) => ({
        email,
        user_id: userId,
        category: mailCategory,
        enabled,
        source: surface.source,
        source_detail: surface.detail,
      }))
    );
    logs.server.info('mailPreference', 'change', {
      email,
      categories,
      enabled,
      source: surface.source,
    });

    // Only on the way out. Confirming an opt-IN would be an email somebody just
    // told us they wanted fewer of.
    if (!enabled) confirmByEmail(email);
    return sheet(email, doc);
  },
};
