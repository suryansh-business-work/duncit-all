/**
 * A FREE pod's justification. Duncit allows free pods only for initiatives,
 * promotions and approved campaigns, so a host making a pod free says why and
 * accepts the free policy (venueOffer.free) — on create and on a resubmit that
 * turns a pod free. Staff (Admin / Club Admin portals) may give one and are
 * audited by the pod's own change log either way; a system-made pod (an Auto
 * Pod materialising) has none. A paid pod carries none.
 */
import { GraphQLError } from 'graphql';
import type { PodAuditSource } from '@modules/pods/podAudit/podAudit.model';
import { cleanFreeJustification } from '@modules/venues/venueOffer/venueOffer.free';
import type { FreeJustification, FreeJustificationInput } from '@modules/venues/venueOffer/venueOffer.types';

interface FreeActor {
  userId?: string | null;
  source: PodAuditSource;
}

/**
 * What the pod is written with: null for a paid pod; the checked input when
 * one is sent; else the justification it already had. A host making a pod free
 * without one is refused (FREE_JUSTIFICATION_REQUIRED) — only an app build from
 * before the free policy can send that, so the message asks for an update.
 */
export function freePodJustification(
  podType: string | null | undefined,
  raw: FreeJustificationInput | null | undefined,
  actor: FreeActor,
  existing?: FreeJustification | null
): FreeJustification | null {
  if (podType !== 'FREE') return null;
  if (raw && actor.userId) return cleanFreeJustification(raw, actor.userId);
  if (existing) return existing;
  if (actor.source !== 'HOST') return null;
  throw new GraphQLError('Update the Duncit app to make a free pod — Duncit now asks why a pod is free', {
    extensions: { code: 'FAILED_PRECONDITION', reason: 'FREE_JUSTIFICATION_REQUIRED', field: 'free_justification' },
  });
}
