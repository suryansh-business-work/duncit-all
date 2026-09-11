import { useQuery } from '@apollo/client/react';
import { Link as RouterLink, useParams } from 'react-router';
import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton } from '@duncit/buttons';
import { BackHeader, QueryGuard } from '@duncit/ui';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import ChangeLogsSection from '../../shared/change-logs';
import { useRecordEditPath } from '../../shared/recordPaths';
import { clubAdminStatusLabels } from '../list/clubAdminColumns';
import { CLUB_ADMIN_DETAIL, type ClubAdminDetail } from '../queries';
import ClubAdminOverviewTab from './ClubAdminOverviewTab';

/** Club Admins → one admin: the record, the clubs they run, and its history. */
type ClubAdminTab = 'overview' | 'changeLogs';
type Translate = ReturnType<typeof useTranslation>['t'];

const tabItems = (t: Translate): DuncitTabItem<ClubAdminTab>[] => [
  { value: 'overview', label: t('directory.hostEditor.tabOverview') },
  { value: 'changeLogs', label: t('directory.changeLogs.tab') },
];

/** Where Back goes: the club admins list, or — when the clubs console opens one
 * of a club's admins — that club. */
export default function ClubAdminDetailsPage({
  backTo = '/club-admins',
}: Readonly<{ backTo?: string }>) {
  const { t } = useTranslation();
  const { clubAdminId = '' } = useParams<{ clubAdminId: string }>();
  const editPath = useRecordEditPath();
  const tabs = useTabParam<ClubAdminTab>({ items: tabItems(t), fallback: 'overview' });
  const { data, loading, error } = useQuery<{ clubAdminProfile: ClubAdminDetail | null }>(
    CLUB_ADMIN_DETAIL,
    {
      variables: { id: clubAdminId },
      fetchPolicy: 'cache-and-network',
      skip: !clubAdminId,
    },
  );
  const admin = data?.clubAdminProfile;
  const labels = clubAdminStatusLabels(t);

  return (
    <QueryGuard
      loading={loading && !admin}
      error={error}
      errorText={error?.message}
      notFound={!admin}
      notFoundText={t('directory.clubAdmins.notFound')}
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() =>
        admin && (
          <Stack spacing={2.5}>
            <BackHeader
              backTo={backTo}
              backAriaLabel={t('directory.venueEditor.backAria')}
              backSx={{ bgcolor: 'action.hover' }}
              eyebrow={t('directory.clubAdmins.eyebrow')}
              title={admin.full_name || t('directory.clubAdmins.unnamed')}
              titleWeight={950}
              titleSx={{ lineHeight: 1.1 }}
              actions={
                <DuncitButton
                  component={RouterLink}
                  to={editPath}
                  variant="contained"
                  startIcon={<EditIcon />}
                >
                  {t('directory.clubAdminEditor.editClubAdmin')}
                </DuncitButton>
              }
            />

            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip size="small" label={labels[admin.status]} />
                  <Chip
                    size="small"
                    variant="outlined"
                    color={admin.is_active ? 'success' : 'default'}
                    label={
                      admin.is_active
                        ? t('directory.hostEditor.live')
                        : t('directory.hostEditor.paused')
                    }
                  />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {admin.club_admin_no ?? ''}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <DuncitTabs {...tabs} variant="scrollable" allowScrollButtonsMobile />

            {tabs.value === 'overview' && <ClubAdminOverviewTab admin={admin} />}
            {tabs.value === 'changeLogs' && (
              <ChangeLogsSection
                entityType="CLUB_ADMIN"
                entityId={admin.id}
                tableId="club-admins-console-change-logs"
              />
            )}
          </Stack>
        )
      }
    </QueryGuard>
  );
}
