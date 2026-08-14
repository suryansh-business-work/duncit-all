import { clubService } from '@modules/clubs/club/club.service';
import { logs } from '@observability/log';
import { pickImages } from './agent.resources';
import type { AgentResultItem } from './agent.types';

/**
 * Creating a batch of clubs.
 *
 * Same contract as the pod batch: one call per club through the service the
 * console uses, each failure reported rather than aborting the run. A club is
 * far simpler than a pod — it books nothing and charges nobody — so the only
 * thing that has to be resolved for it is a feature image.
 */

/** Club names are slugged into a unique id, so a batch cannot repeat one. */
const nameFor = (topic: string, index: number, total: number): string =>
  total === 1 ? topic : `${topic} ${index + 1}`;

export interface ClubBatchInput {
  count: number;
  topic: string;
}

export async function createClubBatch(input: ClubBatchInput): Promise<AgentResultItem[]> {
  const images = await pickImages(input.count);
  const items: AgentResultItem[] = [];

  // Sequential for the same reason pods are: the slug check is a read then a
  // write, and two clubs named alike at the same instant both pass the read.
  for (let index = 0; index < input.count; index += 1) {
    const name = nameFor(input.topic, index, input.count);
    try {
      const club = await clubService.create({
        club_name: name,
        club_description: `A club for people into ${input.topic}.`,
        club_feature_images_and_videos: [
          { url: images[index % images.length], type: 'IMAGE' },
        ],
      });
      items.push({
        kind: 'CLUB',
        ok: true,
        id: String(club?.id ?? ''),
        ref: String(club?.club_id ?? ''),
        title: name,
        detail: 'Created. Add its category, location and admin to publish it.',
      });
    } catch (err) {
      logs.server.warn('agent', 'createClub', { error: err, msg: 'Agent club create failed', name });
      items.push({
        kind: 'CLUB',
        ok: false,
        title: name,
        detail: err instanceof Error ? err.message : 'Could not be created.',
      });
    }
  }
  return items;
}
