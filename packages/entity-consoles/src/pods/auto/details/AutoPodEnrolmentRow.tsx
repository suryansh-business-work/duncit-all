import { Stack } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import type { AutoPodLabels, AutoPodRole, AutoPodTranslate } from '@duncit/utils';
import RoleEnrolmentCard from './RoleEnrolmentCard';
import type { AutoPodAudienceCounts, AutoPodDetailsRow } from '../queries';

interface Props {
  row: AutoPodDetailsRow;
  counts: AutoPodAudienceCounts | null;
  t: AutoPodTranslate;
  labels: AutoPodLabels;
  formatDateTime: (value: string) => string;
  onOpen: (role: AutoPodRole) => void;
}

/**
 * The three enrolment places, side by side: Venue, Host, Club Admin — each
 * with who took it (and when), a way into their details, and how many
 * approved partners in this category could still fill it. A virtual offer's
 * venue card says it is not needed rather than counting venues nobody will
 * ever offer it to.
 */
export default function AutoPodEnrolmentRow({
  row,
  counts,
  t,
  labels,
  formatDateTime,
  onOpen,
}: Readonly<Props>) {
  const virtual = row.pod_mode === 'VIRTUAL';
  const eligible = (n: number) => t('admin.autoPods.eligibleCount', { vars: { n } });
  const shared = {
    eligibleLabel: eligible,
    eligibleHint: t('admin.autoPods.eligibleHint'),
    enrolledAtLabel: t('admin.autoPods.enrolledAt'),
    pendingLabel: labels.tickPending,
    openLabel: t('admin.autoPods.viewDetails'),
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <RoleEnrolmentCard
        {...shared}
        title={t('admin.autoPods.roleVenueTitle')}
        icon={<StorefrontIcon color="action" fontSize="small" />}
        enrolledName={row.venue_claim?.venue_name ?? ''}
        enrolledAt={row.venue_claim ? formatDateTime(row.venue_claim.accepted_at) : ''}
        eligible={counts?.venue_count ?? null}
        notNeeded={virtual ? t('admin.autoPods.notNeededVirtual') : undefined}
        onOpen={() => onOpen('venue')}
      />
      <RoleEnrolmentCard
        {...shared}
        title={t('admin.autoPods.roleHostTitle')}
        icon={<PersonIcon color="action" fontSize="small" />}
        enrolledName={row.host_claim?.host_name ?? ''}
        enrolledAt={row.host_claim ? formatDateTime(row.host_claim.assigned_at) : ''}
        eligible={counts?.host_count ?? null}
        onOpen={() => onOpen('host')}
      />
      <RoleEnrolmentCard
        {...shared}
        title={t('admin.autoPods.roleClubTitle')}
        icon={<GroupsIcon color="action" fontSize="small" />}
        enrolledName={row.club_claim?.club_name ?? ''}
        enrolledAt={row.club_claim ? formatDateTime(row.club_claim.claimed_at) : ''}
        eligible={counts?.club_admin_count ?? null}
        onOpen={() => onOpen('club')}
      />
    </Stack>
  );
}
