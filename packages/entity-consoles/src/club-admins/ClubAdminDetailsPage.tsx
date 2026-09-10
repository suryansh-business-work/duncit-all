import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { BackHeader, InfoRow, QueryGuard, StatusChip } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { CLUB_ADMIN_DETAILS, categoryPath, type ClubAdminRow } from './queries';

/** One titled block of the record. Hoisted, so it is not redefined per render. */
function Section({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

interface DetailRow extends ClubAdminRow {
  created_at?: string | null;
}

/**
 * A club admin's full record — what clicking a row on the list opens.
 *
 * The list could only ever act on a row through its icons, so "who is this
 * person and what do they run" had nowhere to be read. Everything here comes
 * from the same fragment the list already selects, so the two cannot disagree.
 */
export default function ClubAdminDetailsPage() {
  const { t } = useTranslation();
  const { clubAdminId = '' } = useParams<{ clubAdminId: string }>();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();

  const { data, loading, error } = useQuery<{ clubAdminProfile: DetailRow | null }>(
    CLUB_ADMIN_DETAILS,
    {
      variables: { id: clubAdminId },
      fetchPolicy: 'cache-and-network',
      skip: !clubAdminId,
    }
  );
  const admin = data?.clubAdminProfile;

  // Computed above the JSX so neither reads as a nested ternary (S3358).
  const commission = admin?.commission_pct
    ? `${admin.commission_pct}%`
    : t('directory.clubAdmins.commissionDefault');
  const joined = admin?.joined_at ? formatDateTime(admin.joined_at) : '—';
  const created = admin?.created_at ? formatDateTime(admin.created_at) : '—';

  return (
    <QueryGuard
      loading={loading && !data}
      error={error}
      errorText={error?.message}
      notFound={!admin}
      notFoundText={t('directory.clubAdmins.notFound')}
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => (
        <Stack spacing={2.5}>
          <BackHeader
            onBack={() => navigate('/club-admins')}
            backAriaLabel={t('directory.clubAdmins.backToList')}
            backSx={{ bgcolor: 'action.hover' }}
            eyebrow={t('directory.clubAdmins.eyebrow')}
            title={admin!.full_name || t('directory.clubAdmins.unnamed')}
            titleWeight={950}
            titleSx={{ lineHeight: 1.1 }}
          />

          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <StatusChip status={admin!.status} />
            <Chip
              size="small"
              variant="outlined"
              color={admin!.is_active ? 'success' : 'default'}
              label={
                admin!.is_active
                  ? t('directory.common.active')
                  : t('directory.common.inactive')
              }
            />
          </Stack>

          <Section title={t('directory.clubAdmins.contact')}>
            <InfoRow label={t('directory.clubAdmins.email')} value={admin!.email || '—'} />
            <InfoRow label={t('directory.clubAdmins.phone')} value={admin!.phone || '—'} />
            <InfoRow
              label={t('directory.clubAdmins.category')}
              value={categoryPath(admin!) || '—'}
            />
            <InfoRow label={t('directory.clubAdmins.commission')} value={commission} />
          </Section>

          <Section title={t('directory.clubAdmins.assignedClubs')}>
            {admin!.assigned_clubs.length > 0 ? (
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {admin!.assigned_clubs.map((club) => (
                  <Chip
                    key={club.id}
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={club.club_name}
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('directory.clubAdmins.noClubsAssigned')}
              </Typography>
            )}
          </Section>

          <Divider />

          <Section title={t('directory.clubAdmins.onboardingRecord')}>
            <InfoRow
              label={t('directory.clubAdmins.clubAdminId')}
              value={admin!.club_admin_no || '—'}
            />
            <InfoRow
              label={t('directory.clubAdmins.requestNo')}
              value={admin!.request_no || '—'}
            />
            <InfoRow label={t('directory.clubAdmins.joinedAt')} value={joined} />
            <InfoRow label={t('shell.common.created')} value={created} />
            <InfoRow
              label={t('directory.clubAdmins.reviewerNotes')}
              value={admin!.reviewer_notes || '—'}
            />
          </Section>
        </Stack>
      )}
    </QueryGuard>
  );
}
