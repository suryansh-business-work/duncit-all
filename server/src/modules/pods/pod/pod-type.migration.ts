import { PodModel } from './pod.model';
import { PodDraftModel } from '@modules/pods/pod-draft/pod-draft.model';
import { logs } from '@observability/log';

/**
 * The legacy pod_type values and their canonical replacements. PodType is now
 * exactly FREE | PAID — this map is the single source of truth for coercing
 * anything still carrying the old values (stored documents, and string-typed
 * filter input from released app binaries in the field).
 */
export const LEGACY_POD_TYPE_MAP: Record<string, 'FREE' | 'PAID'> = {
  NATIVE_FREE: 'FREE',
  NON_NATIVE_FREE: 'FREE',
  NATIVE_PAID: 'PAID',
  NON_NATIVE_PAID: 'PAID',
  NATIVE_PAID_PREMIUM: 'PAID',
};

/**
 * Idempotent boot-time migration: collapse every stored legacy pod_type to
 * FREE/PAID before the API serves traffic. Runs against the native driver
 * collection deliberately — it bypasses the pod model's soft-delete pre-hooks
 * (deleted pods must migrate too: Pod History still resolves them) and the
 * now-tightened mongoose enum. Re-running is a cheap no-op (the legacy-value
 * filters match nothing once migrated).
 *
 * Pod drafts store the stepper state as an opaque JSON `payload` string, so a
 * resumed legacy draft is fixed with a string-level swap of the embedded
 * `"pod_type":"<LEGACY>"` pair.
 */
export async function migrateLegacyPodTypes(): Promise<void> {
  const modified: Record<string, number> = {};
  for (const [legacy, target] of Object.entries(LEGACY_POD_TYPE_MAP)) {
    const res = await PodModel.collection.updateMany(
      { pod_type: legacy },
      { $set: { pod_type: target } }
    );
    if (res.modifiedCount > 0) modified[legacy] = res.modifiedCount;

    const find = `"pod_type":"${legacy}"`;
    const draftRes = await PodDraftModel.collection.updateMany({ payload: { $regex: find } }, [
      {
        $set: {
          payload: {
            $replaceAll: { input: '$payload', find, replacement: `"pod_type":"${target}"` },
          },
        },
      },
    ]);
    if (draftRes.modifiedCount > 0) modified[`draft:${legacy}`] = draftRes.modifiedCount;
  }
  logs.server.info('migration', 'legacyPodTypes', {
    msg: 'Legacy pod_type migration complete',
    modified,
  });
}
