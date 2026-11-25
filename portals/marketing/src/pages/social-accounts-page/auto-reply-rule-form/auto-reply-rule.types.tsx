import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import type { AutoReplyKind, SocialAutoReplyRule, SocialAutoReplyRuleInput } from '../auto-replies/autoReply.queries';
import type { SocialAccount } from '../queries';

/** The server refuses anything outside these (social.autoReply.rules.ts); the form says so first. */
export const RULE_LIMITS = { name: 80, keywords: 20, keyword: 40, reply: 1000 } as const;

export const AUTO_REPLY_KINDS: readonly AutoReplyKind[] = ['KEYWORD', 'FAQ', 'WELCOME', 'COMMENT_TO_DM'];

/** Each kind's Localization keys, written out so the translation gate sees them used. */
export const KIND_LABEL: Record<AutoReplyKind, string> = {
  KEYWORD: 'marketing.autoReplies.kindKeyword',
  FAQ: 'marketing.autoReplies.kindFaq',
  WELCOME: 'marketing.autoReplies.kindWelcome',
  COMMENT_TO_DM: 'marketing.autoReplies.kindCommentToDm',
};

export const KIND_HINT: Record<AutoReplyKind, string> = {
  KEYWORD: 'marketing.autoReplies.kindKeywordHint',
  FAQ: 'marketing.autoReplies.kindFaqHint',
  WELCOME: 'marketing.autoReplies.kindWelcomeHint',
  COMMENT_TO_DM: 'marketing.autoReplies.kindCommentToDmHint',
};

/** Auto-replies answer only where Meta allows messaging. */
export const messagingAccounts = (accounts: readonly SocialAccount[]) =>
  accounts.filter((account) => account.platform === 'FACEBOOK' || account.platform === 'INSTAGRAM');

/** The keywords are typed as one comma-separated line. */
export interface AutoReplyRuleFormValues {
  name: string;
  kind: AutoReplyKind;
  keywords: string;
  reply_text: string;
  account_ids: string[];
  trusted: boolean;
  enabled: boolean;
}

/** "price, Menu card ,price" → ["PRICE", "MENU CARD"]; the server also drops punctuation. */
export const ruleKeywords = (line: string): string[] => [
  ...new Set(
    line
      .split(',')
      .map((word) => word.trim().toUpperCase())
      .filter(Boolean)
  ),
];

export const NEW_RULE: AutoReplyRuleFormValues = {
  name: '',
  kind: 'KEYWORD',
  keywords: '',
  reply_text: '',
  account_ids: [],
  trusted: false,
  enabled: true,
};

export const ruleFormValues = (rule: SocialAutoReplyRule | null): AutoReplyRuleFormValues =>
  rule
    ? {
        name: rule.name,
        kind: rule.kind,
        keywords: rule.keywords.join(', '),
        reply_text: rule.reply_text,
        account_ids: rule.account_ids,
        trusted: rule.trusted,
        enabled: rule.enabled,
      }
    : NEW_RULE;

export const ruleInput = (values: AutoReplyRuleFormValues): SocialAutoReplyRuleInput => ({
  ...values,
  name: values.name.trim(),
  reply_text: values.reply_text.trim(),
  keywords: values.kind === 'WELCOME' ? [] : ruleKeywords(values.keywords),
});

const tooLong = (t: Translate, max: number) => t('marketing.autoReplies.tooLong', { vars: { max } });

export const autoReplyRuleSchema = (t: Translate) =>
  z
    .object({
      name: z.string().trim().min(1, t('marketing.autoReplies.nameRequired')).max(RULE_LIMITS.name, tooLong(t, RULE_LIMITS.name)),
      kind: z.enum(['KEYWORD', 'FAQ', 'WELCOME', 'COMMENT_TO_DM']),
      keywords: z.string(),
      reply_text: z.string().trim().min(1, t('marketing.autoReplies.replyRequired')).max(RULE_LIMITS.reply, tooLong(t, RULE_LIMITS.reply)),
      account_ids: z.array(z.string()),
      trusted: z.boolean(),
      enabled: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.kind === 'WELCOME') return;
      const words = ruleKeywords(values.keywords);
      const issue = (message: string) => ctx.addIssue({ code: 'custom', path: ['keywords'], message });
      if (words.length === 0) issue(t('marketing.autoReplies.keywordsRequired'));
      else if (words.length > RULE_LIMITS.keywords) issue(t('marketing.socialSettings.tooManyKeywords', { vars: { max: RULE_LIMITS.keywords } }));
      else if (words.some((word) => word.length > RULE_LIMITS.keyword)) issue(t('marketing.socialSettings.keywordTooLong', { vars: { max: RULE_LIMITS.keyword } }));
    });

export interface AutoReplyRuleFormProps {
  /** The rule being changed; null for a new one. */
  rule: SocialAutoReplyRule | null;
  accounts: readonly SocialAccount[];
  /** Only a marketing manager may change rules; everyone else reads them. */
  canEdit: boolean;
  onSubmit: (input: SocialAutoReplyRuleInput) => Promise<void>;
  onCancel: () => void;
  /** Present for a saved rule that may be deleted. */
  onDelete?: () => void;
}
