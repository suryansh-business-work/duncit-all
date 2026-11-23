import { Types } from 'mongoose';
import { IntelMessageModel } from './intelChat.models';

/**
 * Message rate limits: a sliding one-minute window per person (in process)
 * and a daily cap counted from stored messages (shared by every process).
 */

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export function allowMinute(userId: string, perMinute: number, now = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= perMinute) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

export async function underDailyCap(userId: string, perDay: number, now = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - 24 * 3600_000);
  const sent = await IntelMessageModel.countDocuments({ owner_id: new Types.ObjectId(userId), role: 'USER', created_at: { $gte: since } });
  return sent < perDay;
}
