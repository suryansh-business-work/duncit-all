import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { AUTO_REPLY_KINDS, SocialAutoReplyModel, SocialAutoReplyRuleModel, type SocialAutoReplyRuleDoc } from './social.autoReply.model';
import { wordsOf } from './social.autoReply.match';
import { SocialAccountModel } from './social.model';
import { loadSocialSettings } from './social.settings';

/**
 * The auto-reply rules: listed in a table, created, changed and deleted by the
 * people who run Social Settings. Every check is here; the rule form carries
 * the same bounds so a person sees the reason before saving.
 */
export const RULE_LIMITS = { name: 80, keywords: 20, keyword: 40, reply: 1000, accounts: 50 } as const;
const MESSAGING_PLATFORMS = ['FACEBOOK', 'INSTAGRAM'];
const WEEK_MS = 7 * 86_400_000;

export const autoReplyRuleInput = z
  .object({
    name: z.string().trim().min(1).max(RULE_LIMITS.name),
    kind: z.enum(AUTO_REPLY_KINDS),
    keywords: z.array(z.string().trim().min(1).max(RULE_LIMITS.keyword)).max(RULE_LIMITS.keywords),
    reply_text: z.string().trim().min(1).max(RULE_LIMITS.reply),
    account_ids: z.array(z.string().trim().min(1)).max(RULE_LIMITS.accounts),
    trusted: z.boolean(),
    enabled: z.boolean(),
  })
  .strict()
  .transform((rule) => ({
    ...rule,
    // A welcome answers a first message, whatever it says: it keeps no keywords.
    keywords: rule.kind === 'WELCOME' ? [] : [...new Set(rule.keywords.map((word) => wordsOf(word).join(' ')).filter(Boolean))],
    account_ids: [...new Set(rule.account_ids)],
  }));

export type AutoReplyRuleInput = z.output<typeof autoReplyRuleInput>;

const RULE_TABLE: TableEntityConfig = {
  searchFields: ['name', 'keywords', 'reply_text'],
  sortFields: { name: 'name', updated_at: 'updated_at' },
  filterFields: { kind: { type: 'enum' }, enabled: { type: 'boolean' }, trusted: { type: 'boolean' } },
  defaultSort: { updated_at: -1 },
};

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

function notFound(): never {
  throw new GraphQLError('Auto-reply rule not found', { extensions: { code: 'NOT_FOUND' } });
}

async function validated(input: unknown): Promise<AutoReplyRuleInput> {
  const parsed = autoReplyRuleInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    badInput(`${issue?.path.join('.') || 'rule'}: ${issue?.message ?? 'invalid value'}`);
  }
  const rule = parsed.data;
  if (rule.kind !== 'WELCOME' && rule.keywords.length === 0) badInput('keywords: add at least one keyword or phrase');
  // Answering STOP would write to the very person asking not to be written to.
  const settings = await loadSocialSettings();
  const reserved = new Set([...settings.opt_out_keywords, ...settings.opt_in_keywords].map((word) => wordsOf(word).join(' ')));
  const clash = rule.keywords.filter((word) => reserved.has(word));
  if (clash.length > 0) badInput(`keywords: ${clash.join(', ')} is a stop or start keyword in Social Settings`);
  if (rule.account_ids.some((id) => !isValidObjectId(id))) badInput('account_ids: an account is not known');
  const found = await SocialAccountModel.countDocuments({ _id: { $in: rule.account_ids }, platform: { $in: MESSAGING_PLATFORMS } });
  if (found !== rule.account_ids.length) badInput('account_ids: auto-replies answer only connected Facebook and Instagram accounts');
  return rule;
}

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);

function pubRule(doc: SocialAutoReplyRuleDoc, sent: Map<string, number>) {
  const id = String(doc._id);
  return {
    id,
    name: doc.name,
    kind: doc.kind,
    keywords: doc.keywords ?? [],
    reply_text: doc.reply_text,
    account_ids: doc.account_ids ?? [],
    trusted: Boolean(doc.trusted),
    enabled: Boolean(doc.enabled),
    sent_7d: sent.get(id) ?? 0,
    updated_at: iso(doc.updated_at),
  };
}

/** How many replies each rule sent in the last week — one grouped read for the page. */
async function sentLastWeek(ruleIds: readonly string[]): Promise<Map<string, number>> {
  if (ruleIds.length === 0) return new Map();
  const rows = await SocialAutoReplyModel.aggregate<{ _id: string; n: number }>([
    { $match: { rule_id: { $in: ruleIds }, status: 'SENT', created_at: { $gte: new Date(Date.now() - WEEK_MS) } } },
    { $group: { _id: '$rule_id', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.n]));
}

async function loadRule(id: string): Promise<SocialAutoReplyRuleDoc> {
  const doc = isValidObjectId(id) ? await SocialAutoReplyRuleModel.findById(id).lean<SocialAutoReplyRuleDoc>() : null;
  return doc ?? notFound();
}

async function published(id: string) {
  const doc = await loadRule(id);
  return pubRule(doc, await sentLastWeek([id]));
}

export const autoReplyRules = {
  async table(input: TableQueryInput | null | undefined) {
    const { docs, total, page, page_size } = await runTableQuery<SocialAutoReplyRuleDoc>(SocialAutoReplyRuleModel, {}, input, RULE_TABLE);
    const sent = await sentLastWeek(docs.map((doc) => String(doc._id)));
    return { rows: docs.map((doc) => pubRule(doc, sent)), total, page, page_size };
  },

  async create(input: unknown, userId: string) {
    const rule = await validated(input);
    const doc = await SocialAutoReplyRuleModel.create({ ...rule, created_by: userId, updated_by: userId });
    return published(String(doc._id));
  },

  async update(id: string, input: unknown, userId: string) {
    await loadRule(id);
    const rule = await validated(input);
    await SocialAutoReplyRuleModel.updateOne({ _id: id }, { $set: { ...rule, updated_by: userId } });
    return published(id);
  },

  /** Replies it already made stay in the log, named by the rule as it was. */
  async remove(id: string): Promise<boolean> {
    await loadRule(id);
    await SocialAutoReplyRuleModel.deleteOne({ _id: id });
    return true;
  },
};
