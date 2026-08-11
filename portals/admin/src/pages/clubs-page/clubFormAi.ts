import type { ClubFaqValue, ClubFormValues } from '@duncit/club-form';
import { aiChips, aiText } from '../../components/aiFillSanitize';

const sanitizeFaqs = (input: unknown): ClubFaqValue[] | undefined => {
  if (!Array.isArray(input)) return undefined;
  return input
    .map((row: any) => ({
      question: typeof row?.question === 'string' ? row.question.trim() : '',
      answer: typeof row?.answer === 'string' ? row.answer.trim() : '',
    }))
    .filter((row) => row.question && row.answer)
    .slice(0, 10);
};

/** An id the server resolved, or `undefined` to leave the field alone. Anything
 * the lookup could not match is absent from the payload, so a blank string
 * never overwrites a value the admin already picked. */
const aiId = (value: unknown): string | undefined => {
  const id = typeof value === 'string' ? value.trim() : '';
  return id || undefined;
};

/**
 * Merge an AI fill into the club form. Every content field the form renders is
 * mapped — the bullet sections (Who we are / What we do / Perks / Values) and
 * the FAQs are most of the form, and leaving them out was why a fill still read
 * as half-empty.
 *
 * Category, location and the admin are ids the model cannot invent, so it
 * answers them by NAME — picked from the real lists the server sends it — and
 * the SERVER resolves each against the taxonomy, the location list and the Club
 * Admin directory. What arrives here is either a real id or nothing.
 *
 * Those three are only filled where the form is still EMPTY: they are
 * structural choices (which category the venues auto-match on, who runs the
 * club), so an admin who already picked one keeps it, while a fresh club gets
 * all of them.
 */
export function applyAiFillToClubForm(
  d: any,
  prev: ClubFormValues,
  setValues: (v: ClubFormValues) => void
) {
  setValues({
    ...prev,
    club_name: aiText(d?.club_name) ?? prev.club_name,
    club_description: aiText(d?.club_description) ?? prev.club_description,
    feature_text: aiText(d?.feature_text) ?? prev.feature_text,
    moments_text: aiText(d?.moments_text) ?? prev.moments_text,
    community_link: aiText(d?.community_link) ?? prev.community_link,
    group_link: aiText(d?.group_link) ?? prev.group_link,
    who_we_are: aiChips(d?.who_we_are) ?? prev.who_we_are,
    what_we_do: aiChips(d?.what_we_do) ?? prev.what_we_do,
    perks: aiChips(d?.perks) ?? prev.perks,
    values: aiChips(d?.values) ?? prev.values,
    faqs: sanitizeFaqs(d?.faqs) ?? prev.faqs,
    ...resolvedCategory(d, prev),
    ...resolvedLocation(d, prev),
    admin_user_ids: resolvedAdminIds(d, prev),
  });
}

/** Super and Sub move together or not at all: the cascade picker only lists the
 * subs of the chosen super, so a pair from two different supers renders empty. */
function resolvedCategory(d: any, prev: ClubFormValues) {
  if (prev.super_category_id || prev.category_id) return {};
  const superId = aiId(d?.super_category_id);
  if (!superId) return {};
  // A club stores Super + SUB, and its Sub is what `category_id` holds.
  return { super_category_id: superId, category_id: aiId(d?.category_id) ?? '' };
}

/** Location and locality move together too: a locality from another city would
 * pass the form but match no venues. */
function resolvedLocation(d: any, prev: ClubFormValues) {
  if (prev.location_id) return {};
  const locationId = aiId(d?.location_id);
  if (!locationId) return {};
  return { location_id: locationId, locality: aiText(d?.locality) ?? '' };
}

/** Exactly one Club Admin runs a club, so this is a single id or nothing. */
function resolvedAdminIds(d: any, prev: ClubFormValues): string[] {
  const [assigned] = Array.isArray(d?.admin_user_ids) ? d.admin_user_ids : [];
  if (prev.admin_user_ids.length > 0 || !assigned) return prev.admin_user_ids;
  return [String(assigned)];
}
