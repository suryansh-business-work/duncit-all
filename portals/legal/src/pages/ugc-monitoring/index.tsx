import { useMemo, type ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import BlockIcon from '@mui/icons-material/Block';
import { useTranslation } from '@duncit/app-settings';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import ReportedContentTab from './reported/ReportedContentTab';
import ReportSettingsTab from './settings/ReportSettingsTab';
import BlockedAccountsTab from './blocked/BlockedAccountsTab';

type UgcTab = 'reported' | 'blocked' | 'settings';

const TAB_PANELS: Record<UgcTab, ReactNode> = {
  reported: <ReportedContentTab />,
  blocked: <BlockedAccountsTab />,
  settings: <ReportSettingsTab />,
};

const TAB_PREFIX = 'ugc-monitoring';

/**
 * Legal > UGC Monitoring — the desk for content users post and other users
 * report.
 *
 * Two tabs because they are two jobs done by the same people at different
 * times: working the queue of reported posts and stories, and deciding which
 * reasons the app offers in the first place. The open tab lives in the URL, so
 * a link to the settings opens the settings.
 */
export default function UgcMonitoringPage() {
  const { t } = useTranslation();
  const items = useMemo<DuncitTabItem<UgcTab>[]>(
    () => [
      {
        value: 'reported',
        label: t('reportLogs.tabReported'),
        icon: <FlagOutlinedIcon />,
        iconPosition: 'start',
        testId: 'ugc-tab-reported',
      },
      {
        value: 'blocked',
        label: t('reportLogs.tabBlocked'),
        icon: <BlockIcon />,
        iconPosition: 'start',
        testId: 'ugc-tab-blocked',
      },
      {
        value: 'settings',
        label: t('reportLogs.tabSettings'),
        icon: <TuneIcon />,
        iconPosition: 'start',
        testId: 'ugc-tab-settings',
      },
    ],
    [t],
  );
  const tabs = useTabParam<UgcTab>({ items, fallback: 'reported' });

  return (
    <Stack spacing={2} data-testid="ugc-monitoring-page">
      <PageHeader title={t('reportLogs.pageTitle')} subtitle={t('reportLogs.pageSubtitle')} />
      <DuncitTabs {...tabs} idPrefix={TAB_PREFIX} aria-label={t('reportLogs.tabsLabel')} />
      <Box {...tabPanelProps(TAB_PREFIX, tabs.value)}>
        {TAB_PANELS[tabs.value]}
      </Box>
    </Stack>
  );
}
