import { PROMPT_CATEGORIES, required, type InAppPromptDef } from '../prompt.types';
import { BRAND } from './marketing.prompts';

const { MARKETING } = PROMPT_CATEGORIES;

/** Publishing › Pod promotions writes a pod's carousel words and its caption on Claude. */
const MODEL = 'claude-opus-5-5';
const PLANNER = {
  file: 'server/src/modules/crm/marketing/podPromo/podPromo.ai.ts',
  surface: 'Marketing · Publishing › Pod promotions',
  trigger: 'The planner promotes an upcoming pod, or a marketer previews, makes banners or presses Promote now',
};

const POD_VARIABLE = required(
  'pod',
  'Pod',
  'Every fact about the pod as lines of "field: value": title, description, day, time, place, price, what is included, host, venue, club, category.',
  'title: Sunset Run Club\nday: Saturday, 14 Nov 2026\ntime: 06:30 AM\nplace: Cubbon Park, Bengaluru\nprice: Free'
);

export const POD_PROMO_PROMPTS = [
  {
    key: 'pod_promo.caption',
    name: 'Pod promotion caption',
    description: 'Writes the Instagram caption and hashtags of an automatic pod promotion post.',
    category: MARKETING,
    role: 'SYSTEM',
    tasks: ['marketing.pod_promo'],
    target_model: MODEL,
    variables: [],
    usage: [PLANNER],
    content: [
      `You write Instagram captions for Duncit's pod promotions. ${BRAND}`,
      'Write one caption that makes someone want to come to the pod described: lead with the feeling of being there, then the day, time and place exactly as given, then the price exactly as given. Warm, specific, never salesy; at most two emoji.',
      'Use only the facts given. Never invent a performer, a discount, a capacity, a time or a link. Do not write any link: the booking link is added after your caption.',
      'Keep the caption under 1200 characters. Give 5 to 12 hashtags without the # sign, lowercase, no spaces, relevant to the city, the activity and the club.',
      'Return STRICT JSON only, no markdown, of shape {"caption":string,"hashtags":string[]}.',
    ].join('\n'),
  },
  {
    key: 'pod_promo.caption.user',
    name: 'Pod promotion caption — the pod',
    description: 'The pod the caption is for, as facts.',
    category: MARKETING,
    role: 'USER',
    tasks: ['marketing.pod_promo'],
    target_model: MODEL,
    variables: [POD_VARIABLE],
    usage: [PLANNER],
    content: 'The pod:\n{{pod}}',
  },
  {
    key: 'pod_promo.slides',
    name: 'Pod promotion banner words',
    description: 'Writes the words on a pod promotion carousel (kicker, short title, pitch, included list, host and venue lines) and picks its look.',
    category: MARKETING,
    role: 'SYSTEM',
    tasks: ['marketing.pod_promo_banner'],
    target_model: MODEL,
    variables: [],
    usage: [PLANNER],
    content: [
      `You write the words on Duncit's Instagram carousel banners for pods. ${BRAND}`,
      'The carousel has a cover (kicker line and a big title), a details slide (a short pitch and what is included), a host slide and a venue slide. Dates, times, prices and the link are printed from the pod data — never write them.',
      'Limits, in characters: kicker 28 (for example "Duncit presents" or "Save the date"), title 60 (shorter and punchier than the pod title, same meaning), about 260, each included item 48 (reword the given items only, same count, never add one), host_line 110, venue_line 110 (empty when no host or venue is given), scarcity 40.',
      'Pick the look that suits the pod: FESTIVE_BOLD (parties, music, festivals), ELEGANT_SERIF (food, culture, talks), SPORT_NIGHT (sport, fitness, screenings), PLAYFUL_PASTEL (art, craft, pets, kids) or CALM_WELLNESS (yoga, meditation, wellness).',
      'Use only the facts given; no invented names, offers or claims.',
      'Return STRICT JSON only, no markdown, of shape {"style":string,"kicker":string,"title":string,"about":string,"includes":string[],"host_line":string,"venue_line":string,"scarcity":string}.',
    ].join('\n'),
  },
  {
    key: 'pod_promo.slides.user',
    name: 'Pod promotion banner words — the pod',
    description: 'The pod the banner words are for, as facts.',
    category: MARKETING,
    role: 'USER',
    tasks: ['marketing.pod_promo_banner'],
    target_model: MODEL,
    variables: [POD_VARIABLE],
    usage: [PLANNER],
    content: 'The pod:\n{{pod}}',
  },
] as const satisfies readonly InAppPromptDef[];
