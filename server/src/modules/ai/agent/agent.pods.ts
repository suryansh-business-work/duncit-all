import { podService } from '@modules/pods/pod/pod.service';
import { logs } from '@observability/log';
import { pickClub, pickHostUserId, pickImages, pickSlots, type AgentSlot } from './agent.resources';
import type { AgentResultItem } from './agent.types';

/**
 * Creating a batch of pods from one sentence.
 *
 * Everything here goes through `podService.create` — the same call the Admin
 * console makes. That is deliberate: the slot claim, the economics gate, the
 * image rule and the audit row all live in that service, and a second path
 * that wrote pods directly would be a second set of rules to keep in step.
 */

/** The platform's own ceiling on a pod ticket (validated in pod.service). */
const MAX_POD_AMOUNT = 1999;
const MIN_POD_AMOUNT = 199;
const BASE_SPOTS = 10;
const MAX_SPOTS = 50;

/**
 * Spots and a ticket price that clear the venue's own price.
 *
 * The host sits in the pod for free, so only `spots - 1` seats ever carry
 * money — the rule the finance gate checks. The price is set at twice what it
 * takes to cover the slot so the host is left with something, because a pod
 * that only breaks even is rejected on create. When even a full house at the
 * maximum ticket cannot cover the slot, the slot is simply too expensive to
 * fill this way and the caller skips it.
 */
export function priceForSlot(venuePrice: number): { spots: number; amount: number } | null {
  const needed = venuePrice > 0 ? Math.ceil(venuePrice / MAX_POD_AMOUNT) + 1 : BASE_SPOTS;
  const spots = Math.min(MAX_SPOTS, Math.max(BASE_SPOTS, needed));
  const payable = Math.max(1, spots - 1);
  const covering = Math.ceil(venuePrice / payable);
  const amount = Math.min(MAX_POD_AMOUNT, Math.max(MIN_POD_AMOUNT, covering * 2));
  if (amount * payable < venuePrice) return null;
  return { spots, amount };
}

/**
 * The venue and what state the booking is in — never the time.
 *
 * The instant travels separately as an ISO string so the console can render it
 * in the admin-configured date format and time zone; a date formatted here
 * would be one the operator never chose.
 */
function slotSummary(slot: AgentSlot, pending: boolean): string {
  return pending ? `${slot.venueName} · awaiting venue approval` : slot.venueName;
}

/**
 * Titles have to differ.
 *
 * A pod's slug is derived from its title and is unique per club, so ten pods
 * called the same thing is a duplicate-key error on the second one. Numbering
 * them is what makes the batch legal, and it reads as a series besides.
 */
const titleFor = (topic: string, index: number, total: number): string =>
  total === 1 ? topic : `${topic} #${index + 1}`;

export interface PodBatchInput {
  count: number;
  topic: string;
  actorUserId: string;
}

export async function createPodBatch(input: PodBatchInput): Promise<AgentResultItem[]> {
  const [club, hostUserId, slots, images] = await Promise.all([
    pickClub(),
    pickHostUserId(input.actorUserId),
    pickSlots(input.count),
    pickImages(input.count),
  ]);

  const items: AgentResultItem[] = [];
  // Sequential on purpose. The slug uniqueness check is a read followed by a
  // write, so two pods created at the same moment in the same club can both
  // pass the read and the second one dies on the index. One at a time also
  // keeps each slot claim honest against anyone else booking right now.
  for (let index = 0; index < input.count; index += 1) {
    const slot = slots[index];
    const title = titleFor(input.topic, index, input.count);
    if (!slot) {
      items.push({
        kind: 'POD',
        ok: false,
        title,
        detail: 'No free venue slot was left for this one.',
      });
      continue;
    }

    const pricing = priceForSlot(slot.price);
    if (!pricing) {
      items.push({
        kind: 'POD',
        ok: false,
        title,
        detail: `${slot.venueName}'s slot costs more than a full pod can bill, so it was skipped.`,
      });
      continue;
    }

    const pending = slot.ownerUserId !== hostUserId;
    try {
      const pod = await podService.create(
        {
          pod_title: title,
          pod_description: `${input.topic} — hosted at ${slot.venueName}.`,
          pod_hosts_id: [hostUserId],
          club_id: club.id,
          venue_id: slot.venueId,
          venue_slot_id: slot.slotId,
          pod_mode: 'PHYSICAL',
          pod_type: 'PAID',
          pod_amount: pricing.amount,
          // The club's activity can demand a floor the default would break.
          no_of_spots: Math.max(pricing.spots, club.minPax),
          // The slot decides the window; these are overwritten by the service.
          pod_date_time: slot.startAt.toISOString(),
          pod_end_date_time: slot.endAt.toISOString(),
          pod_images_and_videos: [
            { url: images[index % images.length], type: 'IMAGE' },
          ],
        },
        { actorUserId: input.actorUserId, source: 'ADMIN' },
      );
      items.push({
        kind: 'POD',
        ok: true,
        id: String(pod?.id ?? ''),
        ref: String(pod?.pod_id ?? ''),
        title,
        detail: slotSummary(slot, pending),
        when: slot.startAt.toISOString(),
      });
    } catch (err) {
      // One pod failing is not the batch failing. Nine created pods are real
      // and stay; the tenth reports why, which is the only way an operator can
      // fix it and ask again.
      logs.server.warn('agent', 'createPod', { error: err, msg: 'Agent pod create failed', title });
      items.push({
        kind: 'POD',
        ok: false,
        title,
        detail: err instanceof Error ? err.message : 'Could not be created.',
      });
    }
  }
  return items;
}
