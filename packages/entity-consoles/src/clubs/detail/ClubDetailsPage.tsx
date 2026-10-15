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
import { useConsoleAccess } from '../../shared/useConsoleAccess';
import { useVisibility } from '../../shared/visibility/useVisibility';
import { ClubHiddenBanner, HiddenChip, VisibilityButton } from '../../shared/visibility/VisibilityViews';

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
  { value: 'overview', label: t('directory.hostEditor.tabOverview'), testId: 'club-tab-overview' },
  { value: 'hosts', label: t('directory.clubs.tabHosts'), testId: 'club-tab-hosts' },
  { value: 'pods', label: t('directory.hostEditor.tabPods'), testId: 'club-tab-pods' },
  { value: 'changeLogs', label: t('directory.changeLogs.tab'), testId: 'club-tab-changeLogs' },
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
  const { canGovern } = useConsoleAccess();
  const visibility = useVisibility('CLUB');

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
              <Typography variant="h5" component="h1" noWrap data-testid="club-details-title" sx={{
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
              <HiddenChip hidden={!!club.is_hidden} reason={club.hidden_reason} />
            </Stack>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              /{club.club_id}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {canGovern && (
            <VisibilityButton
              hidden={!!club.is_hidden}
              onClick={() =>
                visibility.request({ id: club.id, name: club.club_name, hidden: !!club.is_hidden })
              }
            />
          )}
          <DuncitButton
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/clubs/${club.id}/edit`)}
            data-testid="club-details-edit"
          >
            Edit club
          </DuncitButton>
        </Stack>
      </Stack>

      <ClubHiddenBanner hidden={!!club.is_hidden} reason={club.hidden_reason} />

      <DuncitTabs {...tabs} variant="scrollable" allowScrollButtonsMobile />

      {tabs.value === 'overview' && <ClubOverviewTab club={club} podCount={podCount} />}
      {tabs.value === 'hosts' && (
        <ClubHostsTab clubId={club.id} hostUserIds={club.hosts.map((host) => host.id)} />
      )}
      {/* Keyed on the flag: the tab's table is not a watched query, and the
          club's hide is what changes every row in it. */}
      {tabs.value === 'pods' && <ClubPodsTab key={String(!!club.is_hidden)} clubId={club.id} />}
      {tabs.value === 'changeLogs' && (
        <ChangeLogsSection
          entityType="CLUB"
          entityId={club.id}
          tableId="clubs-console-change-logs"
        />
      )}
      {visibility.dialog}
    </Stack>
      )}
    </QueryGuard>
  );
}
