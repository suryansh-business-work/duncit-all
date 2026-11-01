import { logs } from '@observability/log';
import { askForJson, stringList, text } from '../social/social.llm';
import { PUBLISH_RULES, textLength } from '../social/social.rules';
import type { Copy } from './podPromo.copy';
import type { PodBannerData } from './podPromo.pod';
import { applyRewrite, type SlideCopy } from './banner/banner.copy';
import { BANNER_STYLES, type BannerStyle } from './podPromo.types';

/**
 * Claude's part in a promotion: the words on the slides, the look, and the
 * caption. Every call is optional — no key, the feature switched off in the
 * AI portal, an outage or an unreadable answer all fall back to the template,
 * so a banner or a post is never held up by the AI.
 */
const MAX_HASHTAGS = 12;
const HASHTAG = /^[\p{L}\p{N}_]{1,60}$/u;

/** The pod as "field: value" lines — the only facts the prompts may use. */
export function podFacts(data: PodBannerData, copy: SlideCopy): string {
  const lines: [string, string][] = [
    ['title', data.title],
    ['description', data.description],
    ['day', `${copy.weekday}, ${copy.date}`],
    ['time', copy.time],
    ['place', copy.place],
    ['price', copy.price_detail],
    ['included', data.includes.join('; ')],
    ['host', data.host ? `${data.host.name} — ${data.host.line}` : ''],
    ['venue', data.venue ? `${data.venue.name}, ${data.venue.address} — ${data.venue.line}` : ''],
    ['club', data.club_name],
    ['city', data.city_name],
    ['category', data.category_names.join(', ')],
  ];
  return lines
    .filter(([, value]) => value.trim())
    .map(([field, value]) => `${field}: ${value.replaceAll(/\s+/g, ' ').trim()}`)
    .join('\n');
}

const warn = (operation: string, error: unknown) =>
  logs.server.warn('pod-promo', operation, { error, msg: 'AI unavailable; the template was used' });

export interface SlideWords {
  copy: SlideCopy;
  /** The look Claude picked, when it picked a real one. */
  style: BannerStyle | null;
  ai: boolean;
}

export async function aiSlideWords(data: PodBannerData, base: SlideCopy): Promise<SlideWords> {
  try {
    const answer = await askForJson({
      task: 'marketing.pod_promo_banner',
      systemKey: 'pod_promo.slides',
      userKey: 'pod_promo.slides.user',
      variables: { pod: podFacts(data, base) },
      detail: data.id,
      maxTokens: 900,
    });
    const style = BANNER_STYLES.find((candidate) => candidate === text(answer.style)) ?? null;
    const copy = applyRewrite(base, {
      kicker: text(answer.kicker),
      title: text(answer.title),
      about: text(answer.about),
      includes: stringList(answer.includes, base.includes.length),
      host_line: text(answer.host_line),
      venue_line: text(answer.venue_line),
      scarcity: text(answer.scarcity),
    });
    return { copy, style, ai: true };
  } catch (error) {
    warn('aiSlideWords', error);
    return { copy: base, style: null, ai: false };
  }
}

export interface Caption {
  caption: string;
  hashtags: string[];
  ai: boolean;
}

/** Hashtags as Instagram takes them: no #, no spaces, unique, at most a dozen. */
export function cleanHashtags(values: readonly string[]): string[] {
  const tags = values.map((tag) => tag.trim().replace(/^#+/, '').toLowerCase()).filter((tag) => HASHTAG.test(tag));
  return [...new Set(tags)].slice(0, MAX_HASHTAGS);
}

/**
 * The full post text: caption, booking link, hashtags — cut so the whole
 * fits Instagram's 2,200 characters with the link always kept.
 */
export function postText(caption: Caption, linkLine: string): string {
  const tags = caption.hashtags.map((tag) => `#${tag}`).join(' ');
  const tail = [linkLine, tags].filter(Boolean).join('\n\n');
  const room = PUBLISH_RULES.INSTAGRAM.maxText - textLength(tail) - 2;
  const chars = [...caption.caption.trim()];
  const body = chars.length > room ? `${chars.slice(0, Math.max(0, room - 1)).join('').trimEnd()}…` : chars.join('');
  return [body, tail].filter(Boolean).join('\n\n');
}

export function templateCaption(data: PodBannerData, copy: SlideCopy, t: Copy): Caption {
  const caption = t('caption', {
    title: data.title,
    date: `${copy.weekday}, ${copy.date}`,
    time: copy.time,
    place: copy.place,
    price: copy.price_detail,
    description: copy.about,
  })
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
  const hashtags = cleanHashtags(['duncit', data.city_name.replaceAll(/\s+/g, ''), ...data.category_names.map((name) => name.replaceAll(/\s+/g, ''))]);
  return { caption, hashtags, ai: false };
}

export async function aiCaption(data: PodBannerData, copy: SlideCopy, t: Copy): Promise<Caption> {
  try {
    const answer = await askForJson({
      task: 'marketing.pod_promo',
      systemKey: 'pod_promo.caption',
      userKey: 'pod_promo.caption.user',
      variables: { pod: podFacts(data, copy) },
      detail: data.id,
      maxTokens: 900,
    });
    const caption = text(answer.caption);
    if (!caption) throw new Error('The AI wrote an empty caption');
    return { caption, hashtags: cleanHashtags(stringList(answer.hashtags, MAX_HASHTAGS)), ai: true };
  } catch (error) {
    warn('aiCaption', error);
    return templateCaption(data, copy, t);
  }
}
