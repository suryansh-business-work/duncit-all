import type { PodAuditLog } from '@duncit/utils';

/**
 * One entry of the AI-monitored trail, as BOTH club-admin documents answer it:
 * the monitoring table carries the pod's name, the per-pod activity list does
 * not (the dialog already names the pod), so the two are optional here and
 * every card reads the same shape.
 */
export type AuditEntry = Pick<
  PodAuditLog,
  'id' | 'action' | 'source' | 'actor_name' | 'note' | 'changes' | 'ai_risk' | 'ai_summary' | 'created_at'
> &
  Partial<Pick<PodAuditLog, 'pod_id' | 'pod_title'>>;
