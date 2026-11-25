import { useState } from 'react';
import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
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
      <XStack gap="$2" padding="$3" paddingBottom="$1" role="tablist">
        <YStack flex={1}>
          <DuncitButton
            label={t('crm.leadResearch.tabQueue')}
            onPress={() => setTab('queue')}
            variant={tab === 'queue' ? 'solid' : 'outline'}
            size="sm"
            fullWidth
            testID="research-tab-queue"
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            label={t('crm.leadResearch.tabDiscoveries')}
            onPress={() => setTab('discoveries')}
            variant={tab === 'discoveries' ? 'solid' : 'outline'}
            size="sm"
            fullWidth
            testID="research-tab-discoveries"
          />
        </YStack>
      </XStack>
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
