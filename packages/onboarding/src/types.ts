/** The four ways to earn with Duncit, and the state machine that locks each one. */

/** One `myMeetings` row, as every surface selects it. */
export interface EarnMeeting {
  id: string;
  request_no?: string | null;
  kind: string;
  status: string;
  approval_status?: string | null;
  onboarded_status?: string | null;
  scheduled_at?: string | null;
  requested_at?: string | null;
  reschedule_count?: number | null;
}

/**
 * Where a journey's "next step" CTA sends an already-approved user. A union
 * rather than three optional fields, so "in-app OR partner portal, never
 * neither" is a type guarantee: after a consumer handles the in-app case and
 * returns, `partnerPath` narrows to a string and needs no second guard — which
 * would otherwise be an unreachable branch under the 100% coverage gate.
 */
export type EarnJourneyCta =
  | {
      /** Discriminant. Truthiness alone cannot narrow this — an empty string is
       * falsy, so TS would keep both members alive and force a dead guard. */
      target: 'internal';
      label: string;
      /** Path inside mWeb (`/host/manage`). */
      internalTo: string;
      /** Native stack screen for the same destination as `internalTo`. */
      internalRoute: string;
    }
  | {
      target: 'partner';
      label: string;
      /** Path on the partner portal, opened as an external deep link. */
      partnerPath: string;
    };

/**
 * A journey's identity and copy. Deliberately holds no icon element and no
 * component — an icon KEY that each surface maps to its own icon set, because
 * mWeb renders MUI, native renders @expo/vector-icons and the portals render the
 * shell's AppIcon.
 */
export interface EarnJourney {
  /** Role that means the user already has this — the card locks as "enabled". */
  role: string;
  /** MeetingKind this journey books. */
  kind: string;
  title: string;
  description: string;
  /** Surface-agnostic icon name; each app maps it to its own icon component. */
  iconKey: 'host' | 'venue' | 'ecomm' | 'club';
  /** mWeb / portal survey route. */
  surveyPath: string;
  /** Native stack screen that starts the same journey. */
  nativeRoute: string;
  cta: EarnJourneyCta;
}

export interface EarnBoxState {
  disabled: boolean;
  disabledLabel: string;
  description: string;
  /** True only when the user already holds the role — drives the next-step CTA. */
  approved: boolean;
  /** Set only while an open meeting blocks the card, so the surface can offer
   * reschedule / cancel against it. */
  scheduledMeeting?: EarnMeeting;
}
