/**
 * The one place the draft-pod retention rule is expressed server-side.
 *
 * A Create-Pod draft is deleted `draft_retention_days` (Admin > Pods > Pod
 * Settings, default 3) after its CREATION date — an autosave must not be able
 * to keep an abandoned draft alive forever. Both the sweep that deletes drafts
 * and the `PodDraft.expires_at` the Host Studio counts down from read this
 * module, so the date a host is shown is the date the sweep acts on.
 */
import { AppSettingsModel } from '@modules/platform/settings/settings.model';

export const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_DAYS = 3;

/** The configured retention window, clamped to a sane minimum of 1 day. */
export async function draftRetentionDays(): Promise<number> {
  const doc = await AppSettingsModel.findOne({ singleton_key: 'app' })
    .select('draft_retention_days')
    .lean();
  const raw = Number(doc?.draft_retention_days ?? DEFAULT_RETENTION_DAYS);
  return Math.max(1, Math.floor(raw) || DEFAULT_RETENTION_DAYS);
}

/** When a draft created at `createdAt` is deleted. Null when the draft carries
 * no usable creation date (nothing to promise, so nothing is shown). */
export function draftExpiresAt(
  createdAt: Date | string | null | undefined,
  days: number
): Date | null {
  if (!createdAt) return null;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return null;
  return new Date(created + days * DAY_MS);
}
