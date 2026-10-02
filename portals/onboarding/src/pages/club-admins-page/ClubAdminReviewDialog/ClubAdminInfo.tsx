import { Paper } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { categoryPath, isActiveClubAdmin, type ClubAdminRow } from '../queries';
import { formatDate, useTranslation } from '@duncit/app-settings';

const dateLabel = (iso?: string | null) => (iso ? formatDate(iso) : '—');

/** Who the Club Admin is and where their request stands. */
export default function ClubAdminInfo({ active }: Readonly<{ active: ClubAdminRow }>) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <InfoRow label={t('shell.common.name')} value={active.full_name || '—'} />
      <InfoRow label={t('shell.common.email')} value={active.email || '—'} />
      <InfoRow label={t('shell.common.phone')} value={active.phone || '—'} />
      <InfoRow label={t('onboarding.common.category')} value={categoryPath(active)} />
      <InfoRow
        label={t('onboarding.clubAdmins.assignedClubs')}
        value={active.assigned_clubs.map((c) => c.club_name).join(', ') || '—'}
      />
      <InfoRow label={t('shell.common.status')} value={isActiveClubAdmin(active) ? 'Active' : 'Inactive'} />
      <InfoRow label={t('onboarding.clubAdmins.dateJoined')} value={dateLabel(active.joined_at)} />
      <InfoRow label={t('onboarding.clubAdmins.request')} value={active.request_no || '—'} />
      {active.reviewer_notes && <InfoRow label={t('onboarding.clubAdmins.previousNotes')} value={active.reviewer_notes} />}
    </Paper>
  );
}
