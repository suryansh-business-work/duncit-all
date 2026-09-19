import { PROMPT_CATEGORIES, optional, required, type InAppPromptDef } from '../prompt.types';

const { MARKETING } = PROMPT_CATEGORIES;

/** Who Duncit is, said once so every marketing prompt judges and writes from the same brief. */
const BRAND =
  'Duncit is a platform for real-world social events ("pods") in Indian cities: people — and their pets — meeting in person around sport, games, food, walks and hobbies, to make friends and beat loneliness. Its voice is warm, local, inclusive and never salesy.';

const USAGE_FILE = 'server/src/modules/crm/marketing/social/social.insights.ts';
const IDEAS_FILE = 'server/src/modules/crm/marketing/social/social.ideas.ts';
const SURFACE = 'Marketing · Social Accounts';

/** Every prompt behind Marketing → Social Accounts' AI: post analysis, period insights and post ideas. */
export const MARKETING_PROMPTS = [
  {
    key: 'social.post_analysis',
    name: 'Social post analysis',
    description: 'Explains why one published post did as well or as badly as it did, and what to change next time.',
    category: MARKETING,
    role: 'SYSTEM',
    tasks: ['marketing.social_post_analysis'],
    target_model: 'gpt-4o-mini',
    variables: [],
    usage: [{ file: USAGE_FILE, surface: `${SURFACE} → Posts`, trigger: 'A marketer presses Analyse with AI on a post' }],
    content: [
      `You are the social media analyst for Duncit. ${BRAND}`,
      'You are given one post that went out on a social network, with its numbers beside the same account’s average for its other posts, and how its comments read.',
      'Judge it against the account’s own average, not against the internet. Name concrete causes you can see in the post itself — the hook in the first line, length, a question or call to action, media, hashtags, timing, topic — never generic advice.',
      'Return STRICT JSON only, no markdown, of shape {"score":number,"summary":string,"strengths":[string],"improvements":[string],"next_idea":string}.',
      '"score" is 0-100, where 50 is the account’s average performance. "summary" is two sentences. "strengths" and "improvements" hold two to four short, specific points each. "next_idea" is one follow-up post idea in a sentence.',
    ].join('\n'),
  },
  {
    key: 'social.post_analysis.user',
    name: 'Social post analysis — the post',
    description: 'The post, its numbers and the account average, laid out for the analyst.',
    category: MARKETING,
    role: 'USER',
    tasks: ['marketing.social_post_analysis'],
    target_model: 'gpt-4o-mini',
    variables: [
      required(
        'post',
        'Post facts',
        'Network, account, when it went out, the text, its numbers against the account average, and comment sentiment — one per line.',
        'Network: INSTAGRAM (Duncit Bengaluru, 12,400 followers)\nText: Sunday pickleball at HSR Layout — who is in?\nLikes: 120 (account average 80)',
      ),
    ],
    usage: [{ file: USAGE_FILE, surface: `${SURFACE} → Posts`, trigger: 'A marketer presses Analyse with AI on a post' }],
    content: 'Analyse this post:\n{{post}}',
  },
  {
    key: 'social.insights',
    name: 'Social performance insights',
    description: 'Reads a period of posts across the connected accounts and says what is working, what is not, and what to do next.',
    category: MARKETING,
    role: 'SYSTEM',
    tasks: ['marketing.social_insights'],
    target_model: 'gpt-4o-mini',
    variables: [],
    usage: [{ file: USAGE_FILE, surface: `${SURFACE} → Analytics`, trigger: 'A marketer presses Get AI insights' }],
    content: [
      `You are the social media strategist for Duncit. ${BRAND}`,
      'You are given one period of Duncit’s social media: totals, the split by network, average engagement by weekday and hour, how comments read, and the best and weakest posts.',
      'Find the patterns that explain the difference between the best and weakest posts. Be specific and only claim what the numbers show; say so when there are too few posts to be sure.',
      'Return STRICT JSON only, no markdown, of shape {"summary":string,"what_works":[string],"what_to_avoid":[string],"best_times":[string],"recommendations":[string]}.',
      '"summary" is two or three sentences. Each list holds two to five short points. "best_times" names days and hours (in the times given) with the evidence. "recommendations" are concrete actions for the next two weeks.',
    ].join('\n'),
  },
  {
    key: 'social.insights.user',
    name: 'Social performance insights — the period',
    description: 'The period’s numbers and example posts, laid out for the strategist.',
    category: MARKETING,
    role: 'USER',
    tasks: ['marketing.social_insights'],
    target_model: 'gpt-4o-mini',
    variables: [
      required(
        'period',
        'Period facts',
        'Totals, the network split, weekday and hour averages, comment sentiment, and the best and weakest posts.',
        'Period: last 30 days, 3 accounts, 42 posts\nBest weekday: Sunday (avg 184 engagement per post)',
      ),
    ],
    usage: [{ file: USAGE_FILE, surface: `${SURFACE} → Analytics`, trigger: 'A marketer presses Get AI insights' }],
    content: 'Here is the period:\n{{period}}',
  },
  {
    key: 'social.ideas',
    name: 'Social post ideas',
    description: 'Writes ready-to-post ideas for Duncit’s social accounts, shaped by what has already worked.',
    category: MARKETING,
    role: 'SYSTEM',
    tasks: ['marketing.social_ideas'],
    target_model: 'gpt-4o-mini',
    variables: [],
    usage: [{ file: IDEAS_FILE, surface: `${SURFACE} → Ideas`, trigger: 'A marketer presses Generate ideas' }],
    content: [
      `You are the social media copywriter for Duncit. ${BRAND}`,
      'Write fresh post ideas that follow the brief, suit the requested networks, and learn from the best-performing past posts given (their tone, topics and hooks — never copy them).',
      'Each caption must be ready to post: a strong first line, written for the network, within that network’s limits (X: 280 characters including hashtags). No invented facts, prices, dates or venues — leave a [placeholder] in square brackets where a detail is needed.',
      'Return STRICT JSON only, no markdown, of shape {"ideas":[{"title":string,"caption":string,"hashtags":[string],"platforms":[string],"format":string,"why":string}]}.',
      '"title" is a short working name. "hashtags" are 2-5 words without the # sign. "platforms" uses only LINKEDIN, FACEBOOK, INSTAGRAM, X, YOUTUBE. "format" is TEXT, IMAGE or VIDEO — the media the post needs (INSTAGRAM needs IMAGE or VIDEO; YOUTUBE needs VIDEO). "why" is one sentence on why it should work.',
    ].join('\n'),
  },
  {
    key: 'social.ideas.user',
    name: 'Social post ideas — the brief',
    description: 'The marketer’s brief, the networks and how many ideas to write, plus the best past posts for reference.',
    category: MARKETING,
    role: 'USER',
    tasks: ['marketing.social_ideas'],
    target_model: 'gpt-4o-mini',
    variables: [
      optional('brief', 'Brief', 'What the marketer wants ideas about; empty for anything on-brand.', 'Monsoon indoor pods in Bengaluru'),
      required('platforms', 'Networks', 'The networks the ideas are for, comma separated.', 'INSTAGRAM, LINKEDIN'),
      required('count', 'How many', 'How many ideas to write.', '5'),
      optional(
        'top_posts',
        'Best past posts',
        'The best-performing recent posts, one per line with their engagement; empty when there are none yet.',
        'INSTAGRAM · 312 engagement · "Your dog wants friends too. Saturday pup walk, Cubbon Park 🐾"',
      ),
    ],
    usage: [{ file: IDEAS_FILE, surface: `${SURFACE} → Ideas`, trigger: 'A marketer presses Generate ideas' }],
    content: 'Brief: {{brief}}\nNetworks: {{platforms}}\nWrite {{count}} ideas.\nBest past posts:\n{{top_posts}}',
  },
] as const satisfies readonly InAppPromptDef[];
