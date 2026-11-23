import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { escapedSearchRegex } from '@utils/table-query';

/** The most pods one search term is matched against, so a one-letter search
 * cannot turn into an unbounded `$in`. */
export const POD_TITLE_SEARCH_LIMIT = 200;

/**
 * The extra ways a payment search can match that the payment row cannot answer
 * by itself.
 *
 * A payment stores its pod as `pod_id` only — the title lives on the pod — so
 * searching Payment Logs for "Test pod" matched nothing while filtering by the
 * same pod's id found all its payments. The pods whose title matches are looked
 * up (cancelled ones too: their payments still need finding) and their ids are
 * matched. A pasted 24-character document id finds the payment itself or every
 * payment on that pod.
 */
export async function paymentSearchAlso(search: string | null | undefined): Promise<Record<string, unknown>[]> {
  const text = search?.trim();
  if (!text) return [];
  const clauses: Record<string, unknown>[] = [];
  if (/^[a-f\d]{24}$/i.test(text)) {
    const id = new Types.ObjectId(text);
    clauses.push({ _id: id }, { pod_id: id });
  }
  const pods = await PodModel.find({ pod_title: escapedSearchRegex(text) })
    .select('_id')
    .limit(POD_TITLE_SEARCH_LIMIT)
    .setOptions({ includeDeleted: true })
    .lean();
  if (pods.length > 0) clauses.push({ pod_id: { $in: pods.map((pod) => pod._id) } });
  return clauses;
}
