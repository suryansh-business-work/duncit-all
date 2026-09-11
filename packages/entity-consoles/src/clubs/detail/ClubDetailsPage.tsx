import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Box, Chip, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VerifiedIcon from '@mui/icons-material/Verified';
import { DuncitButton } from '@duncit/buttons';
import { BackButton, QueryGuard } from '@duncit/ui';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { CLUB_DETAIL } from './queries';
import ClubOverviewTab from './ClubOverviewTab';
import ClubHostsTab from './ClubHostsTab';
import ClubPodsTab from './ClubPodsTab';
import ChangeLogsSection from '../../shared/change-logs';
import type { ClubDetail } from './types';
import { useTranslation } from '@duncit/shell';

/**
 * The record, the people and pods it runs, and its history, behind a tab strip.
 *
 * A club's hosts and pods are tables that open each record — editable from
 * there without leaving the club — rather than a list to read. The change log
 * sits on its own tab because hanging that table off the bottom of a
 * two-column layout would bury it.
 */
export type ClubTab = 'overview' | 'hosts' | 'pods' | 'changeLogs';
type Translate = ReturnType<typeof useTranslation>['t'];

const clubTabs = (t: Translate): DuncitTabItem<ClubTab>[] => [
  { value: 'overview', label: t('directory.hostEditor.tabOverview') },
  { value: 'hosts', label: t('directory.clubs.tabHosts') },
  { value: 'pods', label: t('directory.hostEditor.tabPods') },
  { value: 'changeLogs', label: t('directory.changeLogs.tab') },
];

interface ClubDetailData {
  club: ClubDetail | null;
  podCount: { total: number };
}

export default function ClubDetailsPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const tabs = useTabParam<ClubTab>({ items: clubTabs(t), fallback: 'overview' });
  const { data, loading, error } = useQuery<ClubDetailData>(CLUB_DETAIL, {
    variables: { id, clubKey: id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const club = data?.club;
  const podCount = data?.podCount.total ?? 0;

  return (
    <QueryGuard
      loading={loading && !club}
      error={error}
      errorText={error?.message}
      notFound={!club}
      notFoundText="Club not found."
      notFoundSeverity="warning"
    >
      {() => club && (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: "space-between"
        }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            minWidth: 0
          }}>
          <BackButton onClick={() => navigate('/clubs')}>{t('admin.clubs.title')}</BackButton>
          <Box sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                flexWrap: 'wrap'
              }}>
              <Typography variant="h5" noWrap sx={{
                fontWeight: 900
              }}>
                {club.club_name}
              </Typography>
              {club.is_verified && <VerifiedIcon color="primary" fontSize="small" titleAccess="Verified" />}
              <Chip
                size="small"
                label={club.is_active ? t('admin.profile.active') : t('admin.profile.inactive')}
                color={club.is_active ? 'success' : 'default'}
              />
            </Stack>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              /{club.club_id}
            </Typography>
          </Box>
        </Stack>
        <DuncitButton
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/clubs/${club.id}/edit`)}
        >
          Edit club
        </DuncitButton>
      </Stack>

      <DuncitTabs {...tabs} variant="scrollable" allowScrollButtonsMobile />

      {tabs.value === 'overview' && <ClubOverviewTab club={club} podCount={podCount} />}
      {tabs.value === 'hosts' && (
        <ClubHostsTab clubId={club.id} hostUserIds={club.hosts.map((host) => host.id)} />
      )}
      {tabs.value === 'pods' && <ClubPodsTab clubId={club.id} />}
      {tabs.value === 'changeLogs' && (
        <ChangeLogsSection
          entityType="CLUB"
          entityId={club.id}
          tableId="clubs-console-change-logs"
        />
      )}
    </Stack>
      )}
    </QueryGuard>
  );
}
