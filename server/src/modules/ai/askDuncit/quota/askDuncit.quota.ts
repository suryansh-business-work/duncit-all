import { appFormat } from '@utils/app-time';
import { AskDuncitMessageModel } from '../conversation/askDuncitMessage.model';
import type { AskDuncitRolePolicy } from '../settings/askDuncitSettings.types';
import { AskDuncitUsageModel } from './askDuncitUsage.model';

/**
 * Role quotas: messages per minute (burst), messages per day and tokens per
 * day. The day is the admin time zone's calendar day, so "200 a day" resets at
 * local midnight, not UTC.
 *
 * The daily message count is incremented FIRST and checked after, atomically —
 * two messages sent in the same instant cannot both slip under the limit.
 */

export type QuotaRefusal = 'RATE_LIMIT' | 'DAILY_MESSAGES' | 'DAILY_TOKENS';

export const todayKey = (now = new Date()): string => appFormat(now, 'yyyy-MM-dd');

export interface QuotaSnapshot {
  messages_today: number;
  tokens_today: number;
  messages_per_day: number;
  tokens_per_day: number;
}

/** Pure: which limit (if any) the counts break. */
export function quotaRefusalFor(
  counts: { lastMinute: number; messagesToday: number; tokensToday: number },
  policy: Pick<AskDuncitRolePolicy, 'messages_per_minute' | 'messages_per_day' | 'tokens_per_day'>
): QuotaRefusal | null {
  if (counts.lastMinute >= policy.messages_per_minute) return 'RATE_LIMIT';
  if (counts.messagesToday > policy.messages_per_day) return 'DAILY_MESSAGES';
  if (counts.tokensToday >= policy.tokens_per_day) return 'DAILY_TOKENS';
  return null;
}

export const askDuncitQuota = {
  /** Count this message against the quotas; returns why it is refused, or null. */
  async admit(userId: string, policy: AskDuncitRolePolicy): Promise<QuotaRefusal | null> {
    const since = new Date(Date.now() - 60_000);
    const lastMinute = await AskDuncitMessageModel.countDocuments({
      user_id: userId,
      role: 'user',
      created_at: { $gte: since },
    });
    if (lastMinute >= policy.messages_per_minute) return 'RATE_LIMIT';
    const row = await AskDuncitUsageModel.findOneAndUpdate(
      { user_id: userId, day: todayKey() },
      { $inc: { messages: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    const refusal = quotaRefusalFor(
      { lastMinute, messagesToday: row?.messages ?? 1, tokensToday: row?.tokens ?? 0 },
      policy
    );
    // A refused message does not use up the day's allowance.
    if (refusal) await AskDuncitUsageModel.updateOne({ user_id: userId, day: todayKey() }, { $inc: { messages: -1 } });
    return refusal;
  },

  async addTokens(userId: string, tokens: number): Promise<void> {
    if (tokens <= 0) return;
    await AskDuncitUsageModel.updateOne(
      { user_id: userId, day: todayKey() },
      { $inc: { tokens: Math.round(tokens) } },
      { upsert: true }
    );
  },

  async snapshot(userId: string, policy: AskDuncitRolePolicy): Promise<QuotaSnapshot> {
    const row = await AskDuncitUsageModel.findOne({ user_id: userId, day: todayKey() }).lean();
    return {
      messages_today: row?.messages ?? 0,
      tokens_today: row?.tokens ?? 0,
      messages_per_day: policy.messages_per_day,
      tokens_per_day: policy.tokens_per_day,
    };
  },
};
