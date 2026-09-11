import { Chip, Grid, Stack, Typography } from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import GroupsIcon from '@mui/icons-material/Groups';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import SectionCard from '../../venues/detail/SectionCard';
import Fact from '../../shared/Fact';
import type { ClubAdminDetail } from '../queries';

/**
 * The Club Admin record, read: who they are, the clubs they run, and the
 * onboarding trail behind the appointment.
 */
export default function ClubAdminOverviewTab({ admin }: Readonly<{ admin: ClubAdminDetail }>) {
  const { t } = useTranslation();
  const clubs = admin.assigned_clubs ?? [];
  const category =
    [admin.super_category, admin.category, admin.sub_category].filter(Boolean).join(' › ') || '';

  return (
    <Stack spacing={2}>
      <SectionCard icon={<BadgeIcon color="primary" />} title={t('directory.clubAdmins.contact')}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact label={t('directory.hostEditor.fullName')} value={admin.full_name} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact label={t('directory.clubAdmins.email')} value={admin.email} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact label={t('directory.clubAdmins.phone')} value={admin.phone} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact label={t('directory.clubAdmins.category')} value={category} />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard
        icon={<GroupsIcon color="primary" />}
        title={t('directory.clubAdmins.assignedClubs')}
      >
        {clubs.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('directory.clubAdmins.noClubsAssigned')}
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {clubs.map((club) => (
              <Chip key={club.id} size="small" label={club.club_name} />
            ))}
          </Stack>
        )}
      </SectionCard>

      <SectionCard
        icon={<AssignmentIcon color="primary" />}
        title={t('directory.clubAdmins.onboardingRecord')}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact
              label={t('directory.clubAdmins.clubAdminId')}
              value={admin.club_admin_no ?? ''}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact label={t('directory.clubAdmins.requestNo')} value={admin.request_no ?? ''} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact
              label={t('directory.clubAdmins.joinedAt')}
              value={admin.joined_at ? formatDateTime(admin.joined_at) : ''}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact
              label={t('directory.clubAdmins.commission')}
              value={
                admin.commission_pct
                  ? `${admin.commission_pct}%`
                  : t('directory.clubAdmins.commissionDefault')
              }
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Fact
              label={t('directory.clubAdmins.reviewerNotes')}
              value={admin.reviewer_notes ?? ''}
            />
          </Grid>
        </Grid>
      </SectionCard>
    </Stack>
  );
}
