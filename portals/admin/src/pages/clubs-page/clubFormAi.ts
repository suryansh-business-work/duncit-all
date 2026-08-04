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

/**
 * Merge an AI fill into the club form. Every content field the form renders is
 * mapped — the bullet sections (Who we are / What we do / Perks / Values) and
 * the FAQs are most of the form, and leaving them out was why a fill still read
 * as half-empty. Category, location and admins stay untouched: they are ids the
 * model cannot invent. `locality` goes with them — it is written by the location
 * cascade alongside `location_id`, so an invented one would not match any real
 * location and would skew the venue auto-match that reads it.
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
  });
}
