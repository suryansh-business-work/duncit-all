import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { hasMarkedAttendance } from '@modules/pods/ticket/attendance.service';
import { PodModel, type IPodPartyMedia } from './pod.model';

/**
 * Pod media — the photos and videos FROM a pod.
 *
 * One board, one query, exactly as the attendance roster is (rule 41): the
 * host's Upload Pod Media page, the guest arriving on the shared link and the
 * Complete Pod dialog all render the same payload, because "what has this pod
 * got" must not have two answers.
 *
 * WHO MAY UPLOAD IS THE SAME RULE THE RATING LINK USES. The host of the pod,
 * and anyone whose attendance at it was MARKED — a booking is not enough, the
 * same way it is not enough to rate the evening. The link is pasted into a
 * group chat, so the board answers `viewer: NONE` and an empty list for
 * everyone else rather than throwing: the page can then say why, instead of
 * showing a picker the write is going to refuse. It also means a forwarded
 * link never leaks the pod's photos to whoever it was forwarded to.
 */

/** In what capacity the caller is looking at a pod's media. */
export type PodMediaViewer = 'HOST' | 'GUEST' | 'NONE';

/**
 * A ceiling, not a business rule: the media lives on the pod document, so an
 * unbounded list is a document that grows until Mongo refuses to save it.
 */
const MAX_PARTY_MEDIA = 200;

const VIDEO_URL_RE = /\.(mp4|mov|webm|m4v)(\?.*)?$/i;

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

/** The type an uploaded URL carries when the client did not say. */
const mediaType = (url: string): 'IMAGE' | 'VIDEO' => (VIDEO_URL_RE.test(url) ? 'VIDEO' : 'IMAGE');

export interface PodMediaActor {
  id: string;
  isAdmin?: boolean;
}

/**
 * Who is looking, and at which pod.
 *
 * An admin reads as HOST: the Admin panel reviews a pod's evidence, and a
 * reviewer who could not see it would have to ask the host for it by mail.
 */
async function resolveViewer(
  podDocId: string,
  actor: Readonly<PodMediaActor>,
): Promise<{ pod: any; viewer: PodMediaViewer }> {
  if (!Types.ObjectId.isValid(podDocId)) fail('BAD_USER_INPUT', 'Invalid pod id');
  const pod = await PodModel.findById(podDocId);
  if (!pod) return fail('NOT_FOUND', 'Pod not found');

  const isHost = (pod.pod_hosts_id ?? []).some((id: any) => String(id) === actor.id);
  if (isHost || actor.isAdmin) return { pod, viewer: 'HOST' };
  if (await hasMarkedAttendance(podDocId, actor.id)) return { pod, viewer: 'GUEST' };
  return { pod, viewer: 'NONE' };
}

/** The uploaders' names, so a row can say whose photo it is. */
async function uploaderNames(items: IPodPartyMedia[]): Promise<Map<string, string>> {
  const ids = [...new Set(items.map((item) => String(item.uploaded_by)))];
  if (ids.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: ids } })
    .select('profile.first_name profile.last_name')
    .lean();
  return new Map(
    users.map((user: any) => [
      String(user._id),
      `${user.profile?.first_name ?? ''} ${user.profile?.last_name ?? ''}`.trim(),
    ]),
  );
}

async function toBoard(pod: any, viewer: PodMediaViewer, actorId: string) {
  const stored: IPodPartyMedia[] = viewer === 'NONE' ? [] : (pod.pod_party_media ?? []);
  const names = await uploaderNames(stored);
  // Newest first: a host opening the page after the evening wants what just
  // arrived, not what they uploaded before anyone else had sent anything.
  const items = [...stored]
    .sort((a, b) => Number(b.uploaded_at ?? 0) - Number(a.uploaded_at ?? 0))
    .map((item) => ({
      url: item.url,
      type: item.type,
      source: item.source,
      uploaded_by_id: String(item.uploaded_by),
      uploaded_by_name: names.get(String(item.uploaded_by)) ?? '',
      uploaded_at: item.uploaded_at?.toISOString?.() ?? null,
      mine: String(item.uploaded_by) === actorId,
      // A guest takes their own photo back down; the host takes any of them down.
      can_remove: viewer === 'HOST' || String(item.uploaded_by) === actorId,
    }));

  return {
    pod_id: String(pod._id),
    pod_title: pod.pod_title ?? '',
    pod_date_time: pod.pod_date_time?.toISOString?.() ?? null,
    viewer,
    // A cancelled pod never happened; everything else stays open, because
    // guests send their photos in days later and that is the point of the link.
    can_upload: viewer !== 'NONE' && !pod.deleted_at,
    is_cancelled: !!pod.deleted_at,
    items,
    count: items.length,
  };
}

export const podMediaService = {
  /** Everything the Upload Pod Media page and the Complete dialog render. */
  async board(podDocId: string, actor: Readonly<PodMediaActor>) {
    const { pod, viewer } = await resolveViewer(podDocId, actor);
    return toBoard(pod, viewer, actor.id);
  },

  /** Adds what the host or a guest just uploaded, and answers with the board. */
  async add(
    podDocId: string,
    actor: Readonly<PodMediaActor>,
    media: ReadonlyArray<{ url?: string | null; type?: string | null }>,
  ) {
    const { pod, viewer } = await resolveViewer(podDocId, actor);
    if (viewer === 'NONE') {
      fail('FORBIDDEN', 'Only the host and the people marked present can add media to this pod');
    }
    if (pod.deleted_at) fail('FORBIDDEN', 'This pod was cancelled');

    const existing = new Set((pod.pod_party_media ?? []).map((item: IPodPartyMedia) => item.url));
    const fresh = media
      .map((item) => String(item?.url ?? '').trim())
      .filter((url) => url && !existing.has(url))
      .map((url) => ({
        url,
        type: mediaType(url),
        uploaded_by: new Types.ObjectId(actor.id),
        source: viewer === 'HOST' ? ('HOST' as const) : ('GUEST' as const),
        uploaded_at: new Date(),
      }));
    if (fresh.length === 0) return toBoard(pod, viewer, actor.id);
    if ((pod.pod_party_media?.length ?? 0) + fresh.length > MAX_PARTY_MEDIA) {
      fail('BAD_USER_INPUT', `A pod holds at most ${MAX_PARTY_MEDIA} photos and videos`);
    }

    pod.pod_party_media.push(...(fresh as any));
    await pod.save();
    return toBoard(pod, viewer, actor.id);
  },

  /** Takes one item back down — the uploader's own, or anything if a host. */
  async remove(podDocId: string, actor: Readonly<PodMediaActor>, url: string) {
    const { pod, viewer } = await resolveViewer(podDocId, actor);
    if (viewer === 'NONE') fail('FORBIDDEN', 'You cannot change this pod’s media');

    const target = (pod.pod_party_media ?? []).find((item: IPodPartyMedia) => item.url === url);
    if (!target) fail('NOT_FOUND', 'That photo or video is not on this pod');
    if (viewer !== 'HOST' && String(target.uploaded_by) !== actor.id) {
      fail('FORBIDDEN', 'You can only remove media you uploaded yourself');
    }

    pod.pod_party_media = (pod.pod_party_media ?? []).filter(
      (item: IPodPartyMedia) => item.url !== url,
    );
    await pod.save();
    return toBoard(pod, viewer, actor.id);
  },
};
