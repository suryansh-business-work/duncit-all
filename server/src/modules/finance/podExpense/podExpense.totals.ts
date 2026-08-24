/**
 * Pod-spend totals, kept apart from podExpense.service on purpose.
 *
 * The Finance dashboard KPI needs this number, and the service needs
 * `bucketForPod` from breakdown.service — so a dashboard that imported the
 * service would close a module cycle. This file imports nothing but the model.
 */
import { PodExpenseModel } from './podExpense.model';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Total pod spend in a calendar window (`from` inclusive, `to` exclusive). */
export async function podExpenseSpend(from?: Date, to?: Date): Promise<number> {
  const match: Record<string, unknown> = {};
  if (from) match.date = to ? { $gte: from, $lt: to } : { $gte: from };
  const [row] = await PodExpenseModel.aggregate([
    ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return round2(row?.total ?? 0);
}
