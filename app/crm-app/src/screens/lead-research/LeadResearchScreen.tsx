import { useState } from 'react';
import { YStack } from 'tamagui';

import { TabBar } from '@/components/TabBar';
import { useTranslation } from '@/hooks/useTranslation';
import { Discoveries } from './Discoveries';
import { ReviewQueue } from './ReviewQueue';

type Tab = 'queue' | 'discoveries';

/**
 * CRM › Leads › Lead Research: the review queue of researched candidates and
 * the discoveries that find them — the portal page's two tabs. Showing a
 * discovery's candidates switches to the queue, narrowed to that job.
 */
export function LeadResearchScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('queue');
  const [jobId, setJobId] = useState<string | null>(null);
  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack paddingHorizontal="$4">
        <TabBar
          tabs={[
            { key: 'queue', label: t('crm.leadResearch.tabQueue') },
            { key: 'discoveries', label: t('crm.leadResearch.tabDiscoveries') },
          ]}
          active={tab}
          onChange={(key) => setTab(key === 'discoveries' ? 'discoveries' : 'queue')}
          testID="research-tab"
        />
      </YStack>
      {tab === 'queue' ? (
        <ReviewQueue jobId={jobId} onClearJob={() => setJobId(null)} />
      ) : (
        <Discoveries
          onShowJob={(id) => {
            setJobId(id);
            setTab('queue');
          }}
        />
      )}
    </YStack>
  );
}
