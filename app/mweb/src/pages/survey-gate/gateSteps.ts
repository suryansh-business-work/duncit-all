import type { Translate } from '../../i18n/fallback';
import type { CategoryScope } from './CategoryStep';
import type { ActiveSurvey, OnboardingIntro, SurveyKind } from './queries';

export type Step = 'loading' | 'intro' | 'category' | 'survey' | 'meeting' | 'thanks';

/** Which OnboardingIntro field a kind's intro copy is authored under. */
export const introFieldFor = (kind: SurveyKind, intro?: OnboardingIntro | null): string => {
  if (!intro) return '';
  if (kind === 'HOST') return intro.host_intro_html;
  if (kind === 'VENUE') return intro.venue_intro_html;
  if (kind === 'ECOMM') return intro.ecomm_intro_html;
  return intro.club_admin_intro_html;
};

const KIND_HEADINGS: Record<SurveyKind, string> = {
  VENUE: 'Register your venue',
  HOST: 'Become a host',
  ECOMM: 'List your product',
  CLUB_ADMIN: 'Be a Club Admin',
};

/** The heading for a (non-loading) gate phase. The phase names itself; the old
 * subtitle under it restated the phase. */
export function gateHeading(step: Step, kind: SurveyKind, survey: ActiveSurvey | null, t: Translate): string {
  const kindHeading = KIND_HEADINGS[kind];
  if (step === 'intro' || step === 'category') return kindHeading;
  if (step === 'survey') return survey?.title || kindHeading;
  if (step === 'thanks') return t('mweb.surveyGate.youReBooked');
  return t('mweb.surveyGate.bookYourOnboardingMeeting');
}

/** The picked Super → Category → Sub sent with the meeting request. */
export const taxonomyOf = (scope: CategoryScope | null) => ({
  super_category_id: scope?.super_category_id || null,
  category_id: scope?.category_id || null,
  sub_category_id: scope?.sub_category_id || null,
});
