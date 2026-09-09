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
};

/** Highest `{{n}}` in a body — what the registry's param count has to equal. */
export function draftParamCount(body: string): number {
  const numbers = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1]));
  return numbers.length > 0 ? Math.max(...numbers) : 0;
}
