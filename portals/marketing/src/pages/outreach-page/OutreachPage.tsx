import { Box, Stack } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader, type PortalTourStep } from '@duncit/ui';
import { useUserData } from '@duncit/user-context';
import { useTranslation } from '@duncit/app-settings';
import type { Translate } from '@duncit/shell';
import RunsGuide from '../activity-page/RunsGuide';
import { canManageOutreach } from './roles';
import SequencesTab from './sequences/SequencesTab';
import EnrollmentsTab from './enrollments/EnrollmentsTab';
import TasksTab from './tasks/TasksTab';

const TOUR_ID = 'marketing.outreach';

type Tab = 'sequences' | 'enrollments' | 'tasks';

const outreachTabs = (t: Translate): DuncitTabItem<Tab>[] => [
  { value: 'sequences', label: t('marketing.outreach.tabSequences') },
  { value: 'enrollments', label: t('marketing.outreach.tabEnrollments') },
  { value: 'tasks', label: t('marketing.outreach.tabTasks') },
];

const tourSteps = (t: Translate): PortalTourStep[] => [
  { anchor: 'outreach-tabs', title: t('marketing.outreach.tourTabsTitle'), body: t('marketing.outreach.tourTabsBody') },
  { anchor: 'outreach-new', title: t('marketing.outreach.tourNewTitle'), body: t('marketing.outreach.tourNewBody') },
];

/**
 * Outreach › Sequences: steps a lead is walked through — email, WhatsApp on
 * an approved Communications template, a DM a person sends by hand, and the
 * waits between them — until the lead replies, opts out or the steps run out.
 */
export default function OutreachPage() {
  const { t } = useTranslation();
  const { user } = useUserData();
  const canManage = canManageOutreach(user?.roles);
  const tabs = useTabParam<Tab>({ items: outreachTabs(t), fallback: 'sequences' });

  return (
    <Stack spacing={2} sx={{ p: 2 }} data-testid="outreach-page">
      <PageHeader title={t('marketing.outreach.title')} subtitle={t('marketing.outreach.subtitle')} />
      <RunsGuide
        id={TOUR_ID}
        summary={t('marketing.outreach.introSummary')}
        steps={[t('marketing.outreach.introStep1'), t('marketing.outreach.introStep2'), t('marketing.outreach.introStep3')]}
        tour={tourSteps(t)}
      />
      <Box data-tour="outreach-tabs">
        <DuncitTabs {...tabs} idPrefix="outreach" variant="scrollable" scrollButtons="auto" />
      </Box>
      <Box {...tabPanelProps('outreach', tabs.value)}>
        {tabs.value === 'sequences' && <SequencesTab canManage={canManage} />}
        {tabs.value === 'enrollments' && <EnrollmentsTab canManage={canManage} />}
        {tabs.value === 'tasks' && <TasksTab />}
      </Box>
    </Stack>
  );
}
