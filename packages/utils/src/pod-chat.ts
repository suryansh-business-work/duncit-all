/**
 * Who may open a pod's chat — the same rule the server's `isPodMember` keeps
 * (chat.access.ts): the pod's hosts, its attendees, and anyone whose booking is
 * JOINED. mWeb and the native app both draw the Pod Chat entry on every pod's
 * details from this one rule (rule 27), so the two can never disagree about
 * who sees an open door and who is told to book first.
 *
 * It only picks which entry to draw. The server still refuses a non-member's
 * read or post.
 */
export interface PodChatAccessInput {
  /** The signed-in viewer, or null when nobody is signed in. */
  viewerId?: string | null;
  hostIds?: ReadonlyArray<string> | null;
  attendeeIds?: ReadonlyArray<string> | null;
  /** `podMembershipState.is_member` — the viewer's booking is JOINED. */
  isMember?: boolean | null;
}

export function canOpenPodChat({
  viewerId,
  hostIds,
  attendeeIds,
  isMember,
}: Readonly<PodChatAccessInput>): boolean {
  if (!viewerId) return false;
  if (isMember) return true;
  return (hostIds ?? []).includes(viewerId) || (attendeeIds ?? []).includes(viewerId);
}

/** The pod's chat room on mWeb — rooms are keyed by the pod's document id. */
export const podChatPath = (podId: string): string => `/chats/${podId}`;
