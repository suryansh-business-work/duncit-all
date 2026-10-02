/**
 * The `utils` package's demos. Each themed set lives in ./utils/ — the package
 * exports well over a hundred helpers, so one file per area keeps every set
 * readable on its own.
 */
import { brandAndLaunchDemos } from './utils/brand-and-launch';
import { podMoneyDemos } from './utils/pod-money';
import { participationAndAutoPodsDemos } from './utils/participation-and-auto-pods';
import { commPreferenceDemos } from './utils/comm-preference';
import { socialDemos } from './utils/social';
import { hostPodsDemos } from './utils/host-pods';
import { contactAndSignupDemos } from './utils/contact-and-signup';
import { recoveryAndMediaDemos } from './utils/recovery-and-media';
import { feedbackAndAttendanceDemos } from './utils/feedback-and-attendance';
import { insightsAndOrdersDemos } from './utils/insights-and-orders';
import { venuesDemos } from './utils/venues';
import { clubAdminDemos } from './utils/club-admin';
import { invitesAndClaimsDemos } from './utils/invites-and-claims';
import { privacyDemos } from './utils/privacy';
import { crashReportDemos } from './utils/crash-report';
import { defineDemos } from '../types';

export default defineDemos('utils', [
  ...brandAndLaunchDemos,
  ...podMoneyDemos,
  ...participationAndAutoPodsDemos,
  ...commPreferenceDemos,
  ...socialDemos,
  ...hostPodsDemos,
  ...contactAndSignupDemos,
  ...recoveryAndMediaDemos,
  ...feedbackAndAttendanceDemos,
  ...insightsAndOrdersDemos,
  ...venuesDemos,
  ...clubAdminDemos,
  ...invitesAndClaimsDemos,
  ...privacyDemos,
  ...crashReportDemos,
]);
