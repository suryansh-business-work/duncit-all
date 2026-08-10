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
 * Category, location and the admin used to be skipped because they are ids the
 * model cannot invent — which is why naming them in the prompt still left those
 * sections empty. The model now answers them by NAME and the SERVER resolves
 * each against the real taxonomy, location list and Club Admin directory,
 * dropping anything it cannot match. So what arrives here is either a real id
 * or nothing, and nothing means "keep what the admin already chose".
 *
 * `locality` is only taken alongside a resolved `location_id`: it drives the
 * venue auto-match, so a locality belonging to a different city would quietly
 * break the linkage this form exists to set up.
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
    super_category_id: aiId(d?.super_category_id) ?? prev.super_category_id,
    // A club stores Super + SUB, and its Sub is what `category_id` holds.
    category_id: aiId(d?.category_id) ?? prev.category_id,
    ...resolvedLocation(d, prev),
    admin_user_ids: Array.isArray(d?.admin_user_ids) && d.admin_user_ids.length > 0
      ? [String(d.admin_user_ids[0])]
      : prev.admin_user_ids,
  });
}

/** Location and locality move together or not at all: a locality from another
 * city would pass the form but match no venues. */
function resolvedLocation(d: any, prev: ClubFormValues) {
  const locationId = aiId(d?.location_id);
  if (!locationId) return {};
  return { location_id: locationId, locality: aiText(d?.locality) ?? prev.locality };
}
