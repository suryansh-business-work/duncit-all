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
import type { VenueDetailsExtraTab } from '../../venues/detail/VenueDetailsPage';
import HostSummaryCard from './HostSummaryCard';
import HostOverviewTab from './HostOverviewTab';
import HostPodsTab from './HostPodsTab';

/** Hosts → one host: the whole record, the pods they run, and its history. */
type Translate = ReturnType<typeof useTranslation>['t'];

/** `host-tab-<value>` — how an end-to-end suite picks a tab. */
const hostTab = (value: string, label: string): DuncitTabItem<string> => ({ value, label, testId: `host-tab-${value}` });

const hostTabs = (t: Translate): DuncitTabItem<string>[] => [
  hostTab('overview', t('directory.hostEditor.tabOverview')),
  hostTab('pods', t('directory.hostEditor.tabPods')),
  hostTab('changeLogs', t('directory.changeLogs.tab')),
];

export interface HostDetailsPageProps {
  /** Where Back goes: the hosts list, or — when the clubs console opens a club's host — that club. */
  backTo?: string;
  /** The console's own tabs for this host, after the record's (the Hosts console's banner kit). */
  extraTabs?: (host: HostDetail) => VenueDetailsExtraTab[];
}

export default function HostDetailsPage({ backTo = '/hosts', extraTabs }: Readonly<HostDetailsPageProps>) {
  const { t } = useTranslation();
  const { hostId = '' } = useParams<{ hostId: string }>();
  const editPath = useRecordEditPath();
  const { data, loading, error } = useQuery<{ host: HostDetail | null }>(HOST_DETAIL, {
    variables: { host_doc_id: hostId },
    fetchPolicy: 'cache-and-network',
    skip: !hostId,
  });
  const host = data?.host;
  const extra = host && extraTabs ? extraTabs(host) : [];
  // The URL may name an extra tab before the host is in; it resolves once the tab exists.
  const tabs = useTabParam<string>({
    items: [...hostTabs(t), ...extra.map(({ value, label }) => hostTab(value, label))],
    fallback: 'overview',
  });
  const openExtra = extra.find((tab) => tab.value === tabs.value);

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
            {openExtra?.render()}
          </Stack>
        )
      }
    </QueryGuard>
  );
}
