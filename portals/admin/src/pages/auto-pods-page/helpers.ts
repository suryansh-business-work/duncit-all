import type { AutoPodStage } from '@duncit/utils';
import { EM_DASH } from '@duncit/table';
import type { AutoPodTableRow } from './queries';

type StageColor = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error';

/**
 * Written out as whole literals rather than `admin.autoPods.stage${stage}`
 * because scripts/verify-translation-keys.mjs greps source for the literal key
 * — a composed key reads as shipped-but-never-rendered and fails the gate.
 */
export const STAGE_LABEL_KEY: Record<AutoPodStage, string> = {
  OPEN: 'admin.autoPods.stageOpen',
  CLAIMING: 'admin.autoPods.stageClaiming',
  MATERIALIZING: 'admin.autoPods.stageMaterializing',
  LIVE: 'admin.autoPods.stageLive',
  CANCELLED: 'admin.autoPods.stageCancelled',
  EXPIRED: 'admin.autoPods.stageExpired',
};

/** Amber while partners are still enrolling, green once the pod exists. */
export const STAGE_COLOR: Record<AutoPodStage, StageColor> = {
  OPEN: 'warning',
  CLAIMING: 'warning',
  MATERIALIZING: 'info',
  LIVE: 'success',
  CANCELLED: 'error',
  EXPIRED: 'default',
};

const STAGES = Object.keys(STAGE_LABEL_KEY) as AutoPodStage[];

/** Options for the table's stage filter, in enrolment order. */
export function stageFilterOptions(t: (key: string) => string) {
  return STAGES.map((stage) => ({ value: stage, label: t(STAGE_LABEL_KEY[stage]) }));
}

/** The template may only be rewritten while no venue has committed a slot. */
export const isAutoPodEditable = (row: AutoPodTableRow): boolean => row.stage === 'OPEN';

/** Cancelling a pod that already materialized is the Pods page's job, not this one. */
export const isAutoPodCancellable = (row: AutoPodTableRow): boolean =>
  row.stage === 'OPEN' || row.stage === 'CLAIMING';

export const venueNameOf = (row: AutoPodTableRow): string => row.venue_claim?.venue_name || EM_DASH;
export const hostNameOf = (row: AutoPodTableRow): string => row.host_claim?.host_name || EM_DASH;
export const clubNameOf = (row: AutoPodTableRow): string => row.club_claim?.club_name || EM_DASH;
