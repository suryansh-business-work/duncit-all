import { podDraftService } from '@modules/pods/pod-draft/pod-draft.service';
import { logs } from '@observability/log';
import { pickClub, pickHostUserId, pickImages } from './agent.resources';
import type { AgentResultItem } from './agent.types';

/**
 * Creating a batch of pods from one sentence.
 *
 * Venues are booked with an offer now: the host names a window and the price
 * terms (per guest, per hour, per slot or flat), and the venue accepts, rejects
 * or counters. A sentence gives the agent neither a time nor a price, so the
 * agent never books a venue itself. It saves each pod as a Create Pod DRAFT for
 * the host instead — title, description, club, spots and a cover image filled
 * in — and the host opens it, picks the time and offers the venue a price.
 */
export const AGENT_POD_DRAFT_DETAIL =
  'Saved as a draft. Open it in Create Pod to pick a venue and time and offer the venue a price.';

/** Spots a drafted pod starts with; the host changes them in Create Pod. */
const BASE_SPOTS = 10;

/**
 * Titles have to differ.
 *
 * A pod's slug is derived from its title and is unique per club, so ten pods
 * called the same thing is a duplicate-key error on the second one when they
 * are published. Numbering them keeps the batch publishable, and reads as a
 * series besides.
 */
const titleFor = (topic: string, index: number, total: number): string =>
  total === 1 ? topic : `${topic} #${index + 1}`;

export interface PodBatchInput {
  count: number;
  topic: string;
  actorUserId: string;
}

/** The Create Pod form state a draft opens on (both surfaces' field shapes, as Host Again writes them). */
function draftPayload(title: string, topic: string, clubId: string, spots: number, image: string | undefined) {
  return {
    pod_title: title,
    pod_description: topic,
    club_id: clubId,
    pod_mode: 'PHYSICAL',
    venue_id: '',
    pod_type: 'PAID',
    no_of_spots: spots,
    no_of_spots_text: String(spots),
    media_text: image ?? '',
  };
}

export async function createPodBatch(input: PodBatchInput): Promise<AgentResultItem[]> {
  const [club, hostUserId, images] = await Promise.all([
    pickClub(),
    pickHostUserId(input.actorUserId),
    pickImages(input.count),
  ]);
  // The club's activity can demand a floor the default would break.
  const spots = Math.max(BASE_SPOTS, club.minPax);

  const items: AgentResultItem[] = [];
  for (let index = 0; index < input.count; index += 1) {
    const title = titleFor(input.topic, index, input.count);
    try {
      const payload = draftPayload(title, input.topic, club.id, spots, images[index % Math.max(1, images.length)]);
      const draft = await podDraftService.save(hostUserId, null, {
        payload: JSON.stringify(payload),
        pod_title: title,
        pod_mode: 'PHYSICAL',
        step: 0,
      });
      items.push({ kind: 'POD', ok: true, id: String(draft.id ?? ''), title, detail: AGENT_POD_DRAFT_DETAIL });
    } catch (err) {
      // One draft failing is not the batch failing; the rest are real and stay.
      logs.server.warn('agent', 'createPodDraft', { error: err, msg: 'Agent pod draft failed', title });
      items.push({ kind: 'POD', ok: false, title, detail: err instanceof Error ? err.message : 'Could not be saved.' });
    }
  }
  return items;
}
