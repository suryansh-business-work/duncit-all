export const MEDIA_ORGANIZE_PHASES = ['SCAN', 'APPLY', 'ROLLBACK'] as const;
export type MediaOrganizePhase = (typeof MEDIA_ORGANIZE_PHASES)[number];

/** What a MEDIA_ORGANIZE job row carries in `params`. */
export interface MediaOrganizeParams {
  run_id: string;
  phase: MediaOrganizePhase;
  /** Scan and report only — nothing is copied and no document changes. */
  dry_run: boolean;
  /** The ImageKit URL endpoint at the start; only URLs behind it are ours to re-home. */
  endpoint: string;
  /** SCAN: which MEDIA_OWNERS entry is being walked. */
  owner_index: number;
}
