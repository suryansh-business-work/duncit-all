import { PodDetailsPage as SharedPodDetails } from '@duncit/pod-details';
import PodCouponsSection from './pod-coupons/PodCouponsSection';

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
      footer={(pod) => <PodCouponsSection podId={pod.id} podTitle={pod.pod_title} />}
    />
  );
}
