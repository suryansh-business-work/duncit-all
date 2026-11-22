import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { useTranslation } from '@duncit/shell';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import DiscoveriesPanel from './DiscoveriesPanel';
import ReviewQueue from './ReviewQueue';
import { RESEARCH_TAB, useJobFilter, type ResearchTab } from './useJobFilter';

const TAB_PREFIX = 'lead-research';

/**
 * CRM › Lead Research. Researched leads wait in a review queue, scored with
 * the same published Lead Quality model as CRM leads, until someone adds them
 * to the CRM or rejects them. Discoveries search Instagram and Google Maps in
 * the background and fill that queue.
 */
export default function LeadResearchPage() {
  const { t } = useTranslation();
  const { jobId, showJob, clearJob } = useJobFilter();
  const items = useMemo<DuncitTabItem<ResearchTab>[]>(
    () => [
      { value: RESEARCH_TAB.queue, label: t('crm.leadResearch.tabQueue'), testId: 'lead-research-tab-queue' },
      { value: RESEARCH_TAB.discoveries, label: t('crm.leadResearch.tabDiscoveries'), testId: 'lead-research-tab-discoveries' },
    ],
    [t]
  );
  const tabs = useTabParam({ items, fallback: RESEARCH_TAB.queue });

  return (
    <Stack spacing={2}>
      <PageHeader
        title={
          <Stack component="span" direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <PersonSearchIcon color="primary" aria-hidden />
            <span>{t('crm.leadResearch.title')}</span>
          </Stack>
        }
        subtitle={t('crm.leadResearch.subtitle')}
        titleWeight={800}
      />
      <DuncitTabs {...tabs} idPrefix={TAB_PREFIX} searchable={false} />
      <Box {...tabPanelProps(TAB_PREFIX, tabs.value)}>
        {tabs.value === RESEARCH_TAB.queue ? (
          <ReviewQueue jobId={jobId} onClearJob={clearJob} />
        ) : (
          <DiscoveriesPanel onShowCandidates={showJob} />
        )}
      </Box>
    </Stack>
  );
}
