/**
 * Template DRAFTS for scenarios the code introduced ahead of AiSensy.
 *
 * The registry (`whatsapp.events.ts`) pins which campaign a scenario posts and
 * how many values it fills; the body lives at AiSensy, approved by Meta. A new
 * scenario therefore ships with a campaign name nothing at AiSensy answers to,
 * and the Automation board shows `No AiSensy campaign named "…"` until an
 * operator writes the template by hand in the Templates tab — copying the
 * placeholder order out of the registry and hoping it matches.
 *
 * A draft here is that wording, written once beside the registry entry it
 * belongs to, so `provision` on the Automation board can submit it as-is: the
 * template first (Meta decides, asynchronously), then the campaign once the
 * template is APPROVED. The template takes the campaign's name, so a reader of
 * the board sees one name in both columns.
 *
 * Only scenarios that were never provisioned belong here. Once a campaign is
 * LIVE the draft is inert — the board offers nothing for a row that has one.
 * `check:whatsapp` verifies each draft's `{{n}}` count against its params.
 */

export interface WaTemplateDraft {
  /** Meta's category — UTILITY for a message about something the person is already part of. */
  readonly category: 'UTILITY' | 'MARKETING';
  /** The full language NAME AiSensy expects. */
  readonly language: 'English';
  /** The body, `{{n}}` per registry param in order. Meta rejects a body that
   * starts or ends on a placeholder, or puts two side by side. */
  readonly body: string;
  /** The same body with sample values in place — what Meta reviews. */
  readonly sample: string;
}

export const WA_TEMPLATE_DRAFTS: Readonly<Record<string, WaTemplateDraft>> = {
  USER_CONTACT_INVITE: {
    // The only MARKETING draft here: everything else tells somebody about a pod
    // they are already part of, and this one arrives at a number that has never
    // heard of Duncit. Categorising it UTILITY is how a WhatsApp number gets
    // taken down.
    category: 'MARKETING',
    language: 'English',
    body:
      'Hi {{1}}, {{2}} is inviting you to Duncit — the app for joining pods and meetups near you. ' +
      'Sign up and you BOTH earn {{3}} Duncit Coins. ' +
      'Use referral code {{4}} when you join, or open this link and it is filled in for you: {{5}} ' +
      '— Team Duncit',
    sample:
      'Hi Ritu, Meera Nair is inviting you to Duncit — the app for joining pods and meetups near you. ' +
      'Sign up and you BOTH earn 50 Duncit Coins. ' +
      'Use referral code DUN-9F3A2C when you join, or open this link and it is filled in for you: ' +
      'https://mweb.duncit.com/register?ref=DUN-9F3A2C ' +
      '— Team Duncit',
  },
  HOST_POD_CANCELLATION_RISK: {
    category: 'UTILITY',
    language: 'English',
    body:
      'Hi {{1}}, your pod {{2}} on {{3}} at {{4}} is at risk of being cancelled. ' +
      'The bookings so far cannot cover the venue cost: it is short by {{5}}. ' +
      'Bookings needed: {{6}}. ' +
      'If it is still short by {{7}} it will be cancelled automatically and everyone refunded. ' +
      'Share your pod now: {{8}} — or ask your Club Admin about a cheaper slot or a different ticket price. Team Duncit',
    sample:
      'Hi Meera, your pod Sunday Badminton Doubles on 24 Aug 2026 at 07:00 AM is at risk of being cancelled. ' +
      'The bookings so far cannot cover the venue cost: it is short by ₹1200. ' +
      'Bookings needed: 3 more bookings. ' +
      'If it is still short by 23 Aug 2026, 07:00 AM it will be cancelled automatically and everyone refunded. ' +
      'Share your pod now: https://mweb.duncit.com/club/noida-badminton/pod/DUN-POD-4821 — or ask your Club Admin about a cheaper slot or a different ticket price. Team Duncit',
  },
  CLUB_ADMIN_POD_CANCELLATION_RISK: {
    category: 'UTILITY',
    language: 'English',
    body:
      'Hi {{1}}, the pod {{2}} on {{3}} at {{4}}, hosted by {{5}}, is at risk of being cancelled. ' +
      'The bookings so far cannot cover the venue cost: it is short by {{6}}. ' +
      'Bookings needed: {{7}}. ' +
      'If it is still short by {{8}} it will be cancelled automatically and everyone refunded. ' +
      'Help the host fill it, or change the venue slot or the ticket price: {{9}} — Team Duncit',
    sample:
      'Hi Rohit, the pod Sunday Badminton Doubles on 24 Aug 2026 at 07:00 AM, hosted by Meera Nair, is at risk of being cancelled. ' +
      'The bookings so far cannot cover the venue cost: it is short by ₹1200. ' +
      'Bookings needed: 3 more bookings. ' +
      'If it is still short by 23 Aug 2026, 07:00 AM it will be cancelled automatically and everyone refunded. ' +
      'Help the host fill it, or change the venue slot or the ticket price: https://partners-app.duncit.com/club-admin/clubs/66f1/pods/66f2 — Team Duncit',
  },
  /*
   * The four onboarding rejections.
   *
   * One per partner kind because the applicant applied as one of them, and the
   * sentence that follows the reason differs: a venue re-lists, a brand
   * re-applies with its catalogue. Both ways out of an application now send
   * these — the Reject on the meeting schedule and the Deny after the interview
   * are the same news to the applicant, so they carry the same campaign.
   *
   * `venue_rejected_onboarding` is already LIVE at AiSensy, so its draft is
   * inert (the board offers nothing for a row that has a campaign). The other
   * three have never been created: `host_onboarding_rejection` is the gap the
   * registry has carried a note about, and its two siblings the same.
   */
  HOST_ONBOARDING_REJECTED: {
    category: 'UTILITY',
    language: 'English',
    body:
      'Hi {{1}}, thank you for applying to host pods on Duncit. We are not able to take your application forward right now. ' +
      'Reason: {{2}}. ' +
      'You can fill the survey again and book a fresh onboarding slot from Earn with Duncit whenever you are ready. — Team Duncit',
    sample:
      'Hi Meera, thank you for applying to host pods on Duncit. We are not able to take your application forward right now. ' +
      'Reason: The pod plan shared in the interview did not cover safety and group size. ' +
      'You can fill the survey again and book a fresh onboarding slot from Earn with Duncit whenever you are ready. — Team Duncit',
  },
  VENUE_ONBOARDING_REJECTED: {
    category: 'UTILITY',
    language: 'English',
    body:
      'Hi {{1}}, thank you for your interest in listing your venue on Duncit. We are not able to take your application forward right now. ' +
      'Reason: {{2}}. ' +
      'You can fill the survey again and book a fresh onboarding slot from Earn with Duncit whenever you are ready. — Team Duncit',
    sample:
      'Hi Prakhar, thank you for your interest in listing your venue on Duncit. We are not able to take your application forward right now. ' +
      'Reason: The venue photos and safety certificates were incomplete. ' +
      'You can fill the survey again and book a fresh onboarding slot from Earn with Duncit whenever you are ready. — Team Duncit',
  },
  ECOMM_ONBOARDING_REJECTED: {
    category: 'UTILITY',
    language: 'English',
    body:
      'Hi {{1}}, thank you for applying to sell your brand on Duncit. We are not able to take your application forward right now. ' +
      'Reason: {{2}}. ' +
      'You can fill the survey again and book a fresh onboarding slot from Earn with Duncit whenever you are ready. — Team Duncit',
    sample:
      'Hi Rohit, thank you for applying to sell your brand on Duncit. We are not able to take your application forward right now. ' +
      'Reason: The catalogue shared did not match the categories Duncit sells today. ' +
      'You can fill the survey again and book a fresh onboarding slot from Earn with Duncit whenever you are ready. — Team Duncit',
  },
  CLUB_ADMIN_ONBOARDING_REJECTED: {
    category: 'UTILITY',
    language: 'English',
    body:
      'Hi {{1}}, thank you for applying to run a club on Duncit. We are not able to take your application forward right now. ' +
      'Reason: {{2}}. ' +
      'You can fill the survey again and book a fresh onboarding slot from Earn with Duncit whenever you are ready. — Team Duncit',
    sample:
      'Hi Ritu, thank you for applying to run a club on Duncit. We are not able to take your application forward right now. ' +
      'Reason: The interview did not cover how the club would be run week to week. ' +
      'You can fill the survey again and book a fresh onboarding slot from Earn with Duncit whenever you are ready. — Team Duncit',
  },
};

/** Highest `{{n}}` in a body — what the registry's param count has to equal. */
export function draftParamCount(body: string): number {
  const numbers = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1]));
  return numbers.length > 0 ? Math.max(...numbers) : 0;
}
