import {
  PodDetailsPage as SharedPodDetails,
  type PodDetailsActions,
  type PodDetailsViewProps,
} from '@duncit/pod-details';
import PodCouponsSection from './pod-coupons/PodCouponsSection';
import RevokeCancellationAction from './pods-page/revoke-cancellation';

/** The footer the shared view calls with the pod it loaded — hoisted to module
 * scope so React keeps one component identity across renders (S6478). */
const renderCouponsFooter: NonNullable<PodDetailsViewProps['footer']> = (pod) => (
  <PodCouponsSection podId={pod.id} podTitle={pod.pod_title} />
);

/** A cancelled pod is the only one with anything to revoke, and admin is the
 * only console the mutation accepts — so the action is passed in here rather
 * than living in the shared view. */
const renderPodActions: PodDetailsActions = (pod) =>
  pod.is_deleted ? <RevokeCancellationAction podId={pod.id} podTitle={pod.pod_title} /> : null;

/** Admin is the one portal with user pages, so it is the one that links a club
 * admin's name through to theirs. */
const userTo = (userId: string) => `/users/${userId}`;

/** Admin's own pod editor. Passed explicitly rather than left to a default in
 * the shared package: the route belongs to this portal, and a console without
 * one must be able to render the page with no Edit button at all. */
const editTo = (podId: string) => `/pods/${podId}/edit`;

/** Admin's pod detail — the shared view at ADMIN scope (its default).
 *
 * The view lives in @duncit/pod-details so Club Admin renders exactly the same
 * page for the pods of the club they administer (rule 40). Offer codes stay
 * here: the coupons console itself moved to the Marketing portal, but the codes
 * of ONE pod belong on that pod, so the section is injected as the footer
 * rather than widening the shared view. */
export default function AdminPodDetailsPage() {
  return (
    <SharedPodDetails
      userTo={userTo}
      editTo={editTo}
      actions={renderPodActions}
      footer={renderCouponsFooter}
    />
  );
}
