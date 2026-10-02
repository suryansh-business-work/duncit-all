import type { AttendeePerson, SpotFillRow } from '@/components/details/AttendeesDialog';
import type { PodPerson, PodSpotFill } from '@/hooks/useDetails';

/** Builds the full attendee list — hosts first, each flagged for highlighting. */
export function buildAttendeePeople(
  people: PodPerson[],
  attendeeIds: string[],
  hostIds: string[],
  seatsByUser: Record<string, number> = {},
): AttendeePerson[] {
  const byId = new Map(people.map((p) => [p.user_id, p]));
  const hosts = new Set(hostIds);
  const list = (attendeeIds ?? []).map((id) => {
    const person = byId.get(id);
    return {
      user_id: id,
      full_name: person?.full_name ?? null,
      profile_photo: person?.profile_photo ?? null,
      is_host: hosts.has(id),
      seats: seatsByUser[id] ?? 1,
    };
  });
  return [...list.filter((p) => p.is_host), ...list.filter((p) => !p.is_host)];
}

/** A pod host's public profile — name + photo, keyed by user id for navigation. */
export interface HostPerson {
  user_id: string;
  full_name?: string | null;
  profile_photo?: string | null;
}

/** Resolve the pod's host ids to their public profiles, in host order. Missing
 * profiles keep the id (so the row stays tappable) with null name/photo. */
export function buildHostPeople(people: PodPerson[], hostIds: string[]): HostPerson[] {
  const byId = new Map(people.map((p) => [p.user_id, p]));
  return (hostIds ?? []).map((id) => {
    const person = byId.get(id);
    return {
      user_id: id,
      full_name: person?.full_name ?? null,
      profile_photo: person?.profile_photo ?? null,
    };
  });
}

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** Resolve the raw spot fills to display rows ONCE — the caption line and the
 * dialog both render these, so the fallback copy can't drift between them. */
export function buildSpotFillRows(fills: PodSpotFill[], t: Translate): SpotFillRow[] {
  return (fills ?? []).map((fill) => ({
    key: fill.backout_no,
    old_user_id: fill.backed_out_user_id,
    old_name: fill.backed_out_user_name || t('mweb.podDetails.formerAttendee'),
    old_photo: fill.backed_out_profile_photo ?? null,
    filled_by_label: t('mweb.podDetails.spotFilledBy', {
      vars: { name: fill.replacement_user_name || t('mweb.podDetails.newAttendee') },
    }),
  }));
}
