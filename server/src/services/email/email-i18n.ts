import { localizationService } from "@modules/platform/localization/localization.service";
import { UserModel } from "@modules/access/user/user.model";

/**
 * Localized copy for MJML emails (CLAUDE.md rule 38).
 *
 * Templates reference translated text as `{{t:email.<page>.<key>}}`, which is
 * substituted by the SAME applyVars pass that handles every other variable — so
 * no template or renderer had to change shape to gain languages.
 *
 * The server deliberately has no @duncit/* dependencies, so the merge is done
 * here rather than through the shared parser package; the resolution ORDER is
 * identical to it: server text -> this local fallback -> the key.
 */

/** The email surface's LOCAL FALLBACK bundle — flat, like the runtime form.
 * Add a key here AND in Admin > Localization > Translations before using it. */
export const EMAIL_FALLBACK: Record<string, string> = {
  "email.common.greeting": "Hi",
  "email.common.regards": "Thanks",
  "email.common.supportNote":
    "Contact support if you have any questions.",
  "email.common.footerNote": "You are receiving this because you use Duncit.",
  "email.podRefund.title": "Refund initiated",
  "email.podRefund.intro":
    "Your payment for the cancelled pod below has been marked for refund:",
  "email.podRefund.reason": "Reason",
  "email.podRefund.settlementNote":
    "Refunds are settled back to your original payment method.",
  "email.venueSlotRequest.title": "New slot booking request",
  "email.venueSlotRequest.intro": "wants to run their pod at",
  "email.venueSlotRequest.hold":
    "The slot is on hold and the host is waiting on you — the pod only goes live once you approve it.",
  "email.venueSlotRequest.pod": "Pod",
  "email.venueSlotRequest.slot": "Requested slot",
  "email.eventTicket.admits": "Admits",
  "email.venueSlotRequest.approve": "Approve booking",
  "email.venueSlotRequest.decline": "Decline",
  "email.venueSlotRequest.earningsNote":
    "Either button opens the request in the Partners portal, where you can see exactly what this booking earns you before you confirm.",
  "email.venueSlotRequest.reviewAll": "See all pending requests",
  "email.venueSlotRequest.footer":
    "You're receiving this because a host requested one of your venue's availability slots.",
  "email.giftCard.shopScope": "Pod Shop",
  "email.giftCard.title": "You received a gift card",
  "email.giftCard.intro": "sent you a Duncit gift card.",
  "email.giftCard.expires": "Valid until",
  "email.giftCard.redeemCta": "Redeem into Duncit Coins",
  "email.giftCard.howItWorks":
    "Tap the button (or enter the code in the app under Gift Cards > Redeem) and the full value lands in your Duncit Coins instantly. Coins pay for pod bookings and Pod Shop orders at checkout.",
  "email.giftCard.footer":
    "You're receiving this because someone bought a Duncit gift card for this address.",
  "email.grievance.title": "Grievance received",
  "email.grievance.heading": "We have your grievance",
  "email.grievance.intro":
    "Thanks for writing in. Your grievance has been recorded and our Grievance Officer will look into it.",
  "email.grievance.refLabel": "Your reference number",
  "email.grievance.refHint": "Quote this number in any follow-up about this grievance.",
  "email.grievance.subjectLabel": "Subject",
  "email.grievance.detailsLabel": "What you told us",
  "email.grievance.officerLabel": "Grievance Officer",
  "email.grievance.footer": "Reply to this email if you have anything to add.",
  // The signup policy-acceptance receipt (template: policy-acceptance,
  // authored in Tech > Emails > Templates — rule 28, no local MJML).
  "email.policyAcceptance.title": "Your policy acceptance",
  "email.policyAcceptance.heading": "Thanks — that's on the record",
  "email.policyAcceptance.intro":
    "You accepted the policies below when you created your Duncit account.",
  "email.policyAcceptance.listLabel": "What you accepted",
  "email.policyAcceptance.revisit":
    "You can read any of them again whenever you like — nothing here expires, and we will ask you again if one of them changes.",
  "email.policyAcceptance.cta": "Read the policies",
  "email.policyAcceptance.footer":
    "You're receiving this because you accepted these policies when you created your Duncit account.",

  "email.unsubscribe.title": "Your email preferences were updated",
  "email.unsubscribe.heading": "We've updated what we send you",
  "email.unsubscribe.intro":
    "We've stopped sending some kinds of email to this address:",
  "email.unsubscribe.stillSending":
    "You will still get security codes, receipts and notices we are required to send — those cannot be switched off.",
  "email.unsubscribe.manage": "Manage your email preferences",
  "email.unsubscribe.mistake":
    "Didn't do this? Open the link above and switch anything back on. Emails already on their way may still arrive.",

  // Jump-to-Portal access decisions (templates: portal-access-approved/-declined,
  // authored in Tech > Emails > Templates — rule 28, no local MJML).
  "email.portalAccess.approvedTitle": "Your portal access is live",
  "email.portalAccess.approvedBody": "An admin approved your request. Sign in with your existing Duncit account to get started.",
  "email.portalAccess.openPortal": "Open the portal",
  "email.portalAccess.declinedTitle": "About your portal access request",
  "email.portalAccess.declinedBody": "An admin reviewed your request and didn't approve it this time. Reply to this email if you have questions.",
  "email.portalAccess.portalLabel": "Portal",

  // An account or listing was switched off or back on. These emails share one
  // shape; only the noun and the two lines of copy change.
  "email.accountStatus.brandLabel": "Brand",
  "email.accountStatus.productLabel": "Product",
  "email.accountStatus.venueLabel": "Venue",
  "email.accountStatus.hostLabel": "Host account",
  "email.accountStatus.liveHelp":
    "Nothing changed while it was paused — your listings, bookings and payouts are exactly as you left them.",
  "email.accountStatus.pausedHelp":
    "Nothing has been deleted. Reply to this email if you think this is a mistake, or if you want it switched back on.",
  "email.brandActivated.title": "Your brand is live again",
  "email.brandActivated.body":
    "Your brand and its products are visible across Duncit again — shoppers can find your storefront, and hosts can add your products to their pods.",
  "email.brandDeactivated.title": "Your brand has been deactivated",
  "email.brandDeactivated.body":
    "Your brand and its products are hidden from the Duncit marketplace for now, and no new products can be listed while it stays that way.",
  "email.productDeactivated.title": "Your product has been deactivated",
  "email.productDeactivated.body":
    "Your product is temporarily hidden from the Duncit marketplace and pod product picker. Existing orders are not affected.",
  "email.venueActivated.title": "Your venue is live again",
  "email.venueActivated.body":
    "Your venue is discoverable on Duncit again, and hosts can request your availability slots.",
  "email.venueDeactivated.title": "Your venue has been deactivated",
  "email.venueDeactivated.body":
    "Your venue is hidden from Duncit for now — it will not appear in search, and hosts cannot request your slots.",
  "email.hostActivated.title": "Your host account is live again",
  "email.hostActivated.body":
    "You can create and run pods on Duncit again, and your host profile is discoverable.",
  "email.hostDeactivated.title": "Your host account has been deactivated",
  "email.hostDeactivated.body":
    "You cannot create new pods for now, and your host profile is hidden from Duncit.",

  // The opt-out line the footer of every opt-out-able category carries.
  "email.fragment.unsubscribe": "Don't want these emails?",
  "email.fragment.unsubscribeLink": "Manage your email preferences",

  // The header/footer fragments (Tech portal > Emails > Fragments). One note
  // per category, because "why did I get this?" has a different answer for a
  // receipt than for a campaign.
  "email.fragment.help": "Need help? Write to",
  "email.fragment.rights": "All rights reserved.",
  "email.fragment.transactional.note":
    "This is a record of something you did on Duncit.",
  "email.fragment.authentication.note":
    "Never share this code. Duncit will never ask you for it.",
  "email.fragment.marketing.note":
    "You're receiving this because you opted in to Duncit updates.",
  "email.fragment.service.note":
    "Reply to this email and it reaches our team.",
  "email.fragment.notification.note":
    "You're receiving this because of activity on your Duncit account.",
  "email.fragment.support.note":
    "This message is part of your support conversation with Duncit.",
  "email.fragment.billing.note": "Keep this email for your records.",
  "email.fragment.legal.note":
    "This is a notice about your Duncit account that we are required to send.",
  "email.fragment.internal.note":
    "Internal Duncit message. Please do not forward it outside the team.",
};

const PREFIX = "t:";

/** Short TTL so a burst of emails does not re-read the catalogue per send —
 * the same shape as the brand-logo cache in email.service. */
const CATALOGUE_TTL_MS = 60_000;
const catalogueCache = new Map<string, { vars: Record<string, string>; at: number }>();

const recipientCache = new Map<string, { locale: string | null; at: number }>();

/** Test seam: forget cached catalogues and recipient languages. */
export function resetEmailTranslationCache(): void {
  catalogueCache.clear();
  recipientCache.clear();
}

/**
 * The saved language of whoever this address belongs to (`profile.locale`).
 *
 * Resolving it here — rather than threading a locale through all ~40 send
 * wrappers and their call sites — is what makes "change my language" apply to
 * email too, with no change at any call site. A non-user address (admins,
 * newsletter contacts) and an unreachable DB both yield null, i.e. the
 * platform default.
 */
export async function recipientLocale(to: string): Promise<string | null> {
  const email = to.trim().toLowerCase();
  if (!email) return null;

  const cached = recipientCache.get(email);
  if (cached && Date.now() - cached.at < CATALOGUE_TTL_MS) return cached.locale;

  let locale: string | null = null;
  try {
    const user = await UserModel.findOne({ 'auth.email': email })
      .select('profile.locale')
      .lean();
    locale = user?.profile?.locale ?? null;
  } catch {
    /* an email must not fail because the user lookup did */
  }
  recipientCache.set(email, { locale, at: Date.now() });
  return locale;
}

/**
 * Translation variables for one recipient's language, keyed `t:<key>` so they
 * drop straight into the existing `{{ }}` substitution.
 *
 * A missing or unknown locale falls back to the platform default (which
 * publicTranslations already merges), and an unreachable catalogue falls back to
 * the bundle — an email must never ship with a raw key or a blank line.
 */
export async function emailTranslationVars(
  locale?: string | null,
): Promise<Record<string, string>> {
  const requested = (locale ?? "").trim();
  const cached = catalogueCache.get(requested);
  if (cached && Date.now() - cached.at < CATALOGUE_TTL_MS) return cached.vars;

  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(EMAIL_FALLBACK)) {
    vars[`${PREFIX}${key}`] = value;
  }

  // The ENTIRE lookup is guarded, resolving the default locale included: sending
  // an email must never fail because the localization store is unreachable — the
  // bundled copy already renders a complete message.
  try {
    const code = requested || (await localizationService.defaultLocaleCode());
    if (!code) return vars;
    const entries = await localizationService.publicTranslations(code);
    for (const entry of entries) {
      // Blank server text counts as untranslated, so the bundle keeps winning.
      if (entry.value && entry.value.trim() !== "") {
        vars[`${PREFIX}${entry.key}`] = entry.value;
      }
    }
  } catch {
    /* fall through to the bundled copy */
  }
  catalogueCache.set(requested, { vars, at: Date.now() });
  return vars;
}
