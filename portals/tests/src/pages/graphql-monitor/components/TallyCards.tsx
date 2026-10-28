import { Box } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { DistributionCard } from '@duncit/ui';
import type { MonitorTally } from '../queries';

interface Props {
  clients: readonly MonitorTally[];
  errorCodes: readonly MonitorTally[];
  testId: string;
}

const toBuckets = (tallies: readonly MonitorTally[]) => tallies.map((tally) => ({ key: tally.label, count: tally.count }));

/** Who is calling, and how it fails — GraphOS's Clients and error breakdown side by side. */
export default function TallyCards({ clients, errorCodes, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const emptyText = t('tech.graphqlMonitor.tallyEmpty');
  return (
    <Box data-testid={`${testId}-tallies`} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      <DistributionCard title={t('tech.graphqlMonitor.clientsTitle')} buckets={toBuckets(clients)} emptyText={emptyText} />
      <DistributionCard
        title={t('tech.graphqlMonitor.errorCodesTitle')}
        buckets={toBuckets(errorCodes)}
        emptyText={t('tech.graphqlMonitor.errorCodesEmpty')}
      />
    </Box>
  );
}
