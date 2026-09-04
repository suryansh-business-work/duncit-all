// The Earn with Duncit journey cards, meeting actions and dialogs — one MUI
// implementation for mWeb's /earn page and the Partners portal's Earn entry.
// The framework-free journey config/state lives in @duncit/onboarding; the
// native app renders its own Tamagui twin over that same logic (rule 40).
export { EarnSurfaceProvider, useEarnSurface } from './EarnSurfaceProvider';
export type { EarnSurfaceConfig } from './EarnSurfaceProvider';

export { default as EarnJourneyList } from './EarnJourneyList';
// Re-exported so a surface can ask for "the whole menu" without taking a direct
// dependency on @duncit/onboarding — which, for a Docker-built portal, is also a
// Dockerfile COPY line and a package-manifest entry.
export { EARN_KINDS } from '@duncit/onboarding';
export { default as EarnBox } from './EarnBox';
export type { EarnBoxCta } from './EarnBox';
export { default as EarnMeetingActions } from './EarnMeetingActions';
export { default as RescheduleMeetingDialog } from './RescheduleMeetingDialog';
export { default as CancelMeetingDialog } from './CancelMeetingDialog';

export { useEarnProductsVisible } from './useEarnProductsVisible';

export {
  CANCEL_MY_MEETING,
  EARN_ME,
  MEETING_SLOTS,
  PUBLIC_FEATURE_FLAGS,
  RESCHEDULE_MY_MEETING,
} from './queries';
export type { MeetingSlot } from './queries';

export { MeetingReasonForm, blankMeetingReasonValues, buildMeetingReasonSchema } from './meeting-reason';
export type { MeetingReasonValues } from './meeting-reason';

export {
  buildEarnMeetingLabels,
  mwebEarnMeetingLabels,
  shellEarnMeetingLabels,
} from './labels';
export type { EarnMeetingLabels, EarnTranslate } from './labels';
