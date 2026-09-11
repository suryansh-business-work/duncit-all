import { useQuery } from '@apollo/client/react';
import { Link as RouterLink, useParams } from 'react-router';
import { Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton } from '@duncit/buttons';
import { BackHeader, QueryGuard } from '@duncit/ui';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import ChangeLogsSection from '../../shared/change-logs';
import { useRecordEditPath } from '../../shared/recordPaths';
import { HOST_DETAIL, type HostDetail } from '../queries';
import HostSummaryCard from './HostSummaryCard';
import HostOverviewTab from './HostOverviewTab';
import HostPodsTab from './HostPodsTab';

/** Hosts → one host: the whole record, the pods they run, and its history. */
type HostTab = 'overview' | 'pods' | 'changeLogs';
type Translate = ReturnType<typeof useTranslation>['t'];

const hostTabs = (t: Translate): DuncitTabItem<HostTab>[] => [
  { value: 'overview', label: t('directory.hostEditor.tabOverview') },
  { value: 'pods', label: t('directory.hostEditor.tabPods') },
  { value: 'changeLogs', label: t('directory.changeLogs.tab') },
];

/** Where Back goes: the hosts list, or — when the clubs console opens a club's
 * host — that club. */
export default function HostDetailsPage({ backTo = '/hosts' }: Readonly<{ backTo?: string }>) {
  const { t } = useTranslation();
  const { hostId = '' } = useParams<{ hostId: string }>();
  const editPath = useRecordEditPath();
  const tabs = useTabParam<HostTab>({ items: hostTabs(t), fallback: 'overview' });
  const { data, loading, error } = useQuery<{ host: HostDetail | null }>(HOST_DETAIL, {
    variables: { host_doc_id: hostId },
    fetchPolicy: 'cache-and-network',
    skip: !hostId,
  });
  const host = data?.host;

  return (
    <QueryGuard
      loading={loading && !host}
      error={error}
      errorText={error?.message}
      notFound={!host}
      notFoundText={t('directory.hostEditor.notFound')}
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() =>
        host && (
          <Stack spacing={2.5}>
            <BackHeader
              backTo={backTo}
              backAriaLabel={t('directory.venueEditor.backAria')}
              backSx={{ bgcolor: 'action.hover' }}
              eyebrow={t('directory.hostEditor.eyebrow')}
              title={host.full_name || t('directory.hostEditor.unnamed')}
              titleWeight={950}
              titleSx={{ lineHeight: 1.1 }}
              actions={
                <DuncitButton
                  component={RouterLink}
                  to={editPath}
                  variant="contained"
                  startIcon={<EditIcon />}
                >
                  {t('directory.hostEditor.editHost')}
                </DuncitButton>
              }
            />

            <HostSummaryCard host={host} />

            <DuncitTabs {...tabs} variant="scrollable" allowScrollButtonsMobile />

            {tabs.value === 'overview' && <HostOverviewTab host={host} />}
            {tabs.value === 'pods' && <HostPodsTab userId={host.user_id} />}
            {tabs.value === 'changeLogs' && (
              <ChangeLogsSection
                entityType="HOST"
                entityId={host.id}
                tableId="hosts-console-change-logs"
              />
            )}
          </Stack>
        )
      }
    </QueryGuard>
  );
}
