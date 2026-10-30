import { z } from 'zod';
import { bool, filled, finite, gte, int, lte, matches, maxLen, num, obj, shape, str, trim, lowercase } from '@utils/zod-fields';
// The server mirrors @duncit/regex URL_SLUG rather than importing it (see username.ts).
import { CMS_SLUG_PATTERN as URL_SLUG } from '@modules/content/cms/cms.constants';
import { TUTORIAL_LANGUAGES, TUTORIAL_STATUSES } from './tutorial.model';

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const optionalHttpsUrl = (value: string) => value === '' || isHttpsUrl(value);

/** Longest tutorial the feed accepts — the format is "2–3 minutes", with room. */
export const TUTORIAL_MAX_DURATION_SEC = 15 * 60;
export const TUTORIAL_COMMENT_MAX = 500;

export const tutorialInputSchema = obj(
  shape({
    title: str(z.string().check(filled('Give the tutorial a title'), maxLen(120)), {
      required: 'Give the tutorial a title',
      transforms: [trim],
    }),
    description: str(z.string().check(maxLen(1000)), { transforms: [trim], default: '' }),
    topic: str(z.string().check(filled('Pick a topic'), maxLen(60)), { required: 'Pick a topic', transforms: [trim] }),
    language: str(z.enum(TUTORIAL_LANGUAGES), { oneOf: TUTORIAL_LANGUAGES, required: true }),
    video_url: str(
      z
        .string()
        .check(filled('Upload the video first'), maxLen(1000))
        .refine(isHttpsUrl, 'The video must be an https link'),
      { required: 'Upload the video first', transforms: [trim] }
    ),
    thumbnail_url: str(
      z.string().check(maxLen(1000)).refine(optionalHttpsUrl, 'The thumbnail must be an https link'),
      { transforms: [trim], default: '' }
    ),
    duration_sec: num(finite().check(int(), gte(0), lte(TUTORIAL_MAX_DURATION_SEC)), { default: 0 }),
    status: str(z.enum(TUTORIAL_STATUSES), { oneOf: TUTORIAL_STATUSES, default: 'DRAFT' }),
    sort_order: num(finite().check(int(), gte(0), lte(9999)), { default: 0 }),
  })
);

export type TutorialInput = z.infer<typeof tutorialInputSchema>;

export const tutorialTopicInputSchema = obj(
  shape({
    key: str(
      z
        .string()
        .check(filled('Give the topic a key'), maxLen(60), matches(URL_SLUG, 'Use lowercase letters, numbers and hyphens')),
      { required: 'Give the topic a key', transforms: [trim, lowercase] }
    ),
    label: str(z.string().check(filled('Give the topic a name'), maxLen(60)), {
      required: 'Give the topic a name',
      transforms: [trim],
    }),
    sort_order: num(finite().check(int(), gte(0), lte(9999)), { default: 0 }),
    is_active: bool(z.boolean(), { default: true }),
  })
);

export type TutorialTopicInput = z.infer<typeof tutorialTopicInputSchema>;
