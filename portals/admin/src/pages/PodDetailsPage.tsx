import { PodDetailsPage as SharedPodDetails } from '@duncit/pod-details';
import PodCouponsSection from './pod-coupons/PodCouponsSection';

/** Admin's pod detail — the shared view at ADMIN scope (its default).
 *
 * The view lives in @duncit/pod-details so Club Admin renders exactly the same
 * page for the pods of the club they administer (rule 40). Coupons stay here:
 * managing them is platform-wide (ADMIN_RW create/delete) and reaches into the
 * admin coupons page, so it is injected as the footer rather than widened. */
export default function AdminPodDetailsPage() {
  return (
    <SharedPodDetails
      footer={(pod) => <PodCouponsSection podId={pod.id} podTitle={pod.pod_title} />}
    />
  );
}
