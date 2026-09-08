import { NO_POD_ACTIONS, PodDetailsPage } from '@duncit/pod-details';
import { useTranslation } from '../i18n';

/**
 * One pod, opened from either drill-down — the SAME page the Admin portal
 * renders, at REGIONAL scope.
 *
 * Scope is not cosmetic: it swaps every self-fetching section onto the
 * region-scoped twin of its query, because a Regional Club Admin reaches a pod
 * through a membership chain rather than a role, and the admin operations
 * refuse them. The server gates each twin on the pod belonging to this
 * manager's region, so a pod from somebody else's patch is FORBIDDEN whatever
 * this route says.
 *
 * No Edit route: this console reads the region, it does not run the pods in it.
 * The club admin who owns the pod edits it in the Partners console.
 */
export default function RegionPodDetailsPage() {
  const { t } = useTranslation();
  return (
    <PodDetailsPage
      scope="REGIONAL"
      backTo="/club-admins"
      backLabel={t('partners.regional.backToClubAdmins')}
      actions={NO_POD_ACTIONS}
    />
  );
}
