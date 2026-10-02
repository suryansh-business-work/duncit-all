/**
 * Pod input validation and host guards: pod type/amount/date/meeting checks,
 * content normalisation, the moderation re-check on edit, and the active-host
 * and hosted-pod guards.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel, type PodMode, type PodType } from './pod.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { HostModel } from '@modules/venues/host/host.model';
import { moderationService } from '@modules/moderation/moderation.service';
import { podAuditService, snapshotPod } from '@modules/pods/podAudit/podAudit.service';
import type { PodAuditSource } from '@modules/pods/podAudit/podAudit.model';
import { notFound } from './pod.shared';

const WRITABLE_POD_TYPES = new Set<PodType>(['FREE', 'PAID']);

/** Creation and price-changing edits accept only FREE or PAID, and FREE is
 * virtual-only — a physical pod must be PAID. */
export function assertWritablePodType(type: PodType, mode: PodMode) {
  if (!WRITABLE_POD_TYPES.has(type)) {
    throw new GraphQLError('pod_type must be FREE or PAID', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (mode === 'PHYSICAL' && type === 'FREE') {
    throw new GraphQLError('Physical pods must be paid — free pods are only available for virtual pods', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

export function validateAmount(type: PodType, amount: number) {
  if (amount < 0 || amount > 1999) {
    throw new GraphQLError('pod_amount must be between 0 and 1999', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (type === 'FREE' && amount !== 0) {
    throw new GraphQLError('Free pods must have amount 0', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

/**
 * The pod window.
 *
 * A physical pod's end comes off its booked slot, so it may be blank here. A
 * VIRTUAL pod has no slot: its window is the only thing that says when the
 * meeting is over — when the link stops counting as attendance, when the
 * feedback ask fires — so it has to be given.
 */
export function validateFutureDates(
  startValue?: string | Date | null,
  endValue?: string | Date | null,
  requireEnd = false
) {
  const now = Date.now();
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;
  if (!start || Number.isNaN(start.getTime()) || start.getTime() <= now) {
    throw new GraphQLError('Start date/time must be after current date/time', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (requireEnd && !end) {
    throw new GraphQLError('End date/time is required for a virtual pod', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (end && (Number.isNaN(end.getTime()) || end.getTime() <= now || end.getTime() < start.getTime())) {
    throw new GraphQLError('End date/time must be after current date/time and start date/time', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

export function normalizeStatusMedia(media: any) {
  const url = String(media?.url ?? '').trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new GraphQLError('Status media must be uploaded before saving', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const type = media?.type === 'VIDEO' ? 'VIDEO' : 'IMAGE';
  return { url, type };
}

export function normalizePodMode(mode?: string | null): PodMode {
  return mode === 'VIRTUAL' ? 'VIRTUAL' : 'PHYSICAL';
}

/**
 * Reel videos are uploaded (direct-to-ImageKit) before the pod is saved, so the
 * only acceptable value is a hosted https URL. Empty/null clears the reel.
 */
export function normalizeReelUrl(value?: string | null): string | null {
  const url = String(value ?? '').trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    throw new GraphQLError('Reel video must be uploaded before saving', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return url;
}

export function validateMeetingDetails(mode: PodMode, input: any, current?: any) {
  if (mode !== 'VIRTUAL') return;
  const meetingUrl = input.meeting_url === undefined ? current?.meeting_url : input.meeting_url;
  const trimmed = typeof meetingUrl === 'string' ? meetingUrl.trim() : '';
  if (!trimmed) {
    throw new GraphQLError('Meeting link is required for virtual pods', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('bad protocol');
  } catch {
    throw new GraphQLError('Meeting link must be a valid http(s) URL', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

/** Every pod must carry at least one IMAGE in its media gallery. */
export function validateHasImage(media: any[] | null | undefined) {
  const hasImage = (media ?? []).some((m: any) => (m?.type ?? 'IMAGE') === 'IMAGE' && m?.url);
  if (!hasImage) {
    throw new GraphQLError('At least one pod image is required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

/**
 * The moderatable content of a pod write. An absent field reads as empty text,
 * which never violates anything.
 */
export function podContentOf(input: any) {
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  const media = Array.isArray(input?.pod_images_and_videos) ? input.pod_images_and_videos : [];
  return {
    pod_title: text(input?.pod_title),
    pod_description: text(input?.pod_description),
    pod_info: text(input?.pod_info),
    pod_hashtag: Array.isArray(input?.pod_hashtag) ? input.pod_hashtag.map(String) : [],
    image_urls: media.map((item: any) => String(item?.url ?? '')).filter(Boolean),
  };
}

type PodContent = ReturnType<typeof podContentOf>;

/** Which pod field a moderation violation belongs to, in audit-trail terms. */
const VIOLATION_AUDIT_FIELD: Record<string, keyof PodContent | 'pod_images_and_videos'> = {
  pod_title: 'pod_title',
  pod_description: 'pod_description',
  pod_info: 'pod_info',
  pod_hashtag: 'pod_hashtag',
  image: 'pod_images_and_videos',
};

/** The refused values, in the same shape `snapshotPod` stores them, so the
 * monitoring console diffs a blocked attempt exactly like a saved edit. */
const attemptedValues = (content: PodContent): Record<string, string> => ({
  pod_title: content.pod_title,
  pod_description: content.pod_description,
  pod_info: content.pod_info,
  pod_hashtag: content.pod_hashtag.join(', '),
  pod_images_and_videos: content.image_urls.join(', '),
});

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/**
 * The content fields this write actually CHANGES.
 *
 * An edit is judged on what it introduces, not on what it inherits. The portal
 * editor posts the whole form on every save, so screening the payload as-is
 * would let a description written before these rules existed block an
 * unrelated price correction forever. Touch that description and it must come
 * out clean; leave it alone and it is not this edit's business.
 */
function changedContent(doc: any, next: PodContent): PodContent {
  const current = podContentOf(doc);
  return {
    pod_title: next.pod_title === current.pod_title ? '' : next.pod_title,
    pod_description: next.pod_description === current.pod_description ? '' : next.pod_description,
    pod_info: next.pod_info === current.pod_info ? '' : next.pod_info,
    pod_hashtag: sameList(next.pod_hashtag, current.pod_hashtag) ? [] : next.pod_hashtag,
    image_urls: sameList(next.image_urls, current.image_urls) ? [] : next.image_urls,
  };
}

/**
 * Content guard for an edit of an EXISTING pod — host, Club Admin and Admin
 * alike. A refusal is not silently dropped: it lands in the AI-monitored audit
 * trail as a REJECTED entry carrying what was attempted and why it was
 * refused, so both monitoring consoles show the attempt and not only the edits
 * that got through.
 */
export async function assertEditContentClean(
  doc: any,
  attempt: PodContent,
  audit: { actorUserId?: string | null; source: PodAuditSource }
) {
  const content = changedContent(doc, attempt);
  const violations = moderationService.podViolations(content);
  if (violations.length === 0) return;

  const before = snapshotPod(doc);
  const attempted = attemptedValues(content);
  const fields = [...new Set(violations.map((v) => VIOLATION_AUDIT_FIELD[v.field]).filter(Boolean))];
  await podAuditService.record({
    pod: doc,
    action: 'REJECTED',
    source: audit.source,
    actorUserId: audit.actorUserId,
    changes: fields.map((field) => ({
      field: String(field),
      from: before[String(field)] ?? '',
      to: attempted[String(field)] ?? '',
    })),
    note: violations
      .map((v) => {
        const evidence = v.evidence ? ` ("${v.evidence}")` : '';
        return `${v.field}: ${v.message}${evidence}`;
      })
      .join(' · '),
  });
  throw moderationService.podRejection(violations);
}

/**
 * The one host-capability gate. Host powers follow the HOST role — granted by
 * the admin role toggle AND automatically on host-application approval — with
 * an approved host profile accepted as a fallback so legacy approved hosts
 * (without the cached role) keep working. A deactivated host is refused even
 * while still holding the cached role; role-only hosts (no Host doc) are
 * unaffected.
 *
 * Exported so a host claiming an Auto Pod is authorised by exactly the same
 * rule as a host creating one — two gates would drift on who counts as active.
 */
export async function assertActiveHost(userId: string) {
  const userObjectId = new Types.ObjectId(userId);
  const hostDoc = await HostModel.findOne({ user_id: userObjectId }).select('status is_active');
  if (hostDoc?.is_active === false) {
    throw new GraphQLError('Your host account has been deactivated', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  const hasHostRole = await UserRoleModel.exists({ user_id: userObjectId, role: 'HOST' });
  const approvedHost = !hasHostRole && hostDoc?.status === 'APPROVED';
  if (!hasHostRole && !approvedHost) {
    throw new GraphQLError('Host access is required before creating pods', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

/** Loads a pod and asserts the viewer is one of its hosts. */
/** Exported so sibling modules (ticket check-in) authorise a host action against
 * exactly the same rule as hostUpdatePod / hostDeletePod — one gate, one truth. */
export async function findHostedPod(id: string, userId: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const doc = await PodModel.findById(id);
  if (!doc) notFound();
  const isHost = (doc!.pod_hosts_id ?? []).some((hostId: any) => String(hostId) === userId);
  if (!isHost) {
    throw new GraphQLError('Only the pod host can manage this pod', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return doc!;
}
