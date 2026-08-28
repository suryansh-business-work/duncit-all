import type { NestedCatalogue } from '../catalogue';

/**
 * The participation timeline on a booking — what happened to this seat, in the
 * order it happened.
 *
 * Its own namespace because the SAME tree is drawn on three surfaces from one
 * builder: mWeb and the native app show a member their own booking, and the
 * portals show staff the same rows through `@duncit/pod-details`. Parking the
 * wording in `mweb.*` left the portals resolving keys they do not ship — a
 * console would have rendered raw key paths where the story of a refund should
 * be. `@duncit/utils` owns the shape of the tree and picks which of these each
 * node says; the words are here.
 */
export const POD_TIMELINE_BUNDLE: NestedCatalogue = {
  podTimeline: {
    actorAdmin: 'Duncit',
    actorClubAdmin: 'the club admin',
    actorHost: 'the host',
    actorSystem: 'the system',
    actorVenue: 'the venue',
    attendanceNotRecordedDetail:
      'Nobody scanned tickets at this pod, so attendance was never taken.',
    attendanceNotRecordedTitle: 'Attendance Not Recorded',
    attendedDetail: 'You attended the pod. Experience recorded.',
    attendedTitle: 'Pod Attended',
    backoutRequestedDetail: 'You have requested to back out from the pod.',
    backoutRequestedTitle: 'Pod Backout Requested',
    cancelledByActorDetail: 'The pod was cancelled by {actor}.',
    cancelledByDetail: 'The pod was cancelled.',
    cancelledByTitle: 'Cancelled By',
    dateArrivesDetail: 'The pod is happening as scheduled.',
    dateArrivesTitle: 'Pod Date Arrives',
    findingReplacementDetail:
      'Your seat is back on sale. The refund follows once somebody takes it.',
    findingReplacementTitle: 'Finding Your Replacement',
    joinedDetail: 'You have successfully joined the pod.',
    joinedTitle: 'Pod Joined',
    keptSpotDetail: 'You reserved your spot back and stayed in the pod.',
    keptSpotTitle: 'Spot Kept',
    notAttendedDetail: 'You did not attend the pod.',
    notAttendedTitle: 'Pod Not Attended',
    // A partial backout has to say so where it happened: "You backed out" is
    // a lie when somebody gave up one seat of four and is still going.
    partialBackoutDetail: 'You released {seats} of {before} seats and kept {kept}.',
    partialBackoutTitle: 'Partial Backout Requested',
    podCancelledDetail: 'The pod has been cancelled.',
    podCancelledTitle: 'Pod Cancelled',
    refundInitiatedDetail: 'Refund has been initiated to your original payment method.',
    refundInitiatedTitle: 'Refund Initiated',
    refundNotEligibleDetail: 'Refund is not eligible as per policy.',
    refundNotEligibleTitle: 'Refund Not Eligible',
    refundPendingDetail: 'Your refund is with our finance team and has not left yet.',
    refundPendingTitle: 'Refund Being Processed',
    spotFilledDetail: 'Your spot was filled by someone else.',
    spotFilledTitle: 'Spot Filled',
    spotNotFilledDetail: 'Your spot could not be filled by anyone.',
    spotNotFilledTitle: 'Spot Not Filled',
  },
};
