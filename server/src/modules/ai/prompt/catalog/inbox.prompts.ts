import { PROMPT_CATEGORIES, optional, required, type InAppPromptDef } from '../prompt.types';
import { BRAND } from './marketing.prompts';

const { MARKETING } = PROMPT_CATEGORIES;

/**
 * "Suggest reply" in Marketing → Social → Inbox. Claude drafts one answer to
 * one comment; the draft lands in an editable box and is only ever sent by a
 * person pressing Send (social.replies.ts). `social.inbox.ai.ts` reads
 * `{"reply": string}` and cuts it to the network's limit.
 */
const REPLY_MODEL = 'claude-opus-5-5';
const USAGE = [
  {
    file: 'server/src/modules/crm/marketing/social/social.inbox.ai.ts',
    surface: 'Marketing · Social › Inbox',
    trigger: 'A marketer presses Suggest reply on a comment',
  },
] as const;

export const INBOX_PROMPTS = [
  {
    key: 'social.inbox.reply',
    name: 'Inbox reply draft',
    description: 'Drafts a reply to one comment on Duncit’s own social posts, for a marketer to edit before sending.',
    category: MARKETING,
    role: 'SYSTEM',
    tasks: ['marketing.inbox_reply'],
    target_model: REPLY_MODEL,
    variables: [],
    usage: USAGE,
    content: [
      `You write replies to comments left on Duncit’s own social media posts. ${BRAND}`,
      'Write ONE reply, as the brand, in the voice of a warm, helpful community team: short, specific to what the person said, and in the language they wrote in (Hindi and Hinglish included).',
      '- Thank genuine praise briefly; answer a question directly; meet a complaint with an apology and a next step (for example, asking them to message the team) without arguing.',
      '- Never invent facts, prices, dates, venues, offers or promises. When a detail is needed and not given, leave a [placeholder] in square brackets for the marketer to fill.',
      '- Never repeat personal information, never ask for passwords or payment details, and do not engage with abuse, spam or scams — for those, a short, polite, neutral line is enough.',
      '- No hashtags unless the comment used one; at most one emoji; stay within the character limit you are given.',
      'Answer with STRICT JSON only, no markdown, of shape {"reply": string}.',
    ].join('\n'),
  },
  {
    key: 'social.inbox.reply.user',
    name: 'Inbox reply draft — the comment',
    description: 'The comment to answer, with its network, the post it was left on and the AI’s read of it.',
    category: MARKETING,
    role: 'USER',
    tasks: ['marketing.inbox_reply'],
    target_model: REPLY_MODEL,
    variables: [
      required('platform', 'Network', 'The network the comment was left on.', 'INSTAGRAM'),
      optional('account', 'Account', 'The Duncit account that posted.', 'Duncit'),
      optional('post', 'Post', 'The start of the post the comment is under.', 'Sunday pickleball at HSR Layout — 8 spots left'),
      optional('author', 'Author', 'Who wrote the comment, when the network says.', 'asha.r'),
      required('comment', 'Comment', 'What the person wrote.', 'Is this open to beginners?'),
      optional('verdict', 'AI verdict', 'The AI’s sentiment, severity and reason, when it has read the comment.', 'NEUTRAL'),
      required('limit', 'Character limit', 'The longest reply the network takes.', '2200'),
    ],
    usage: USAGE,
    content:
      'NETWORK: {{platform}}\nACCOUNT: {{account}}\nPOST: {{post}}\nAUTHOR: {{author}}\nCOMMENT: {{comment}}\nAI VERDICT: {{verdict}}\nCHARACTER LIMIT: {{limit}}',
  },
] as const satisfies readonly InAppPromptDef[];
