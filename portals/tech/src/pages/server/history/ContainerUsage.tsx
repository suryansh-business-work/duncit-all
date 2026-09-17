import { Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import { formatPct } from '../../stress-testing/labels';
import InfoList from '../InfoList';
import { formatBytes } from '../format';
import { useServerHistory } from './useServerHistory';

const BYTES_PER_MB = 1_048_576;

/** The heaviest containers over the month — which neighbour on the shared VPS holds the memory. */
export default function ContainerUsage() {
  const { t } = useTranslation();
  const { history } = useServerHistory();
  const containers = history?.containers ?? [];

  return (
    <SectionCard title={t('tech.server.containersTitle')} subtitle={t('tech.server.containersSubtitle')}>
      {containers.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.server.containersEmpty')}
        </Typography>
      ) : (
        <InfoList
          rows={containers.map((c) => ({
            label: c.name,
            value: t('tech.server.containerUsage', {
              vars: {
                avg: formatBytes(c.memoryAvgMb * BYTES_PER_MB),
                peak: formatBytes(c.memoryPeakMb * BYTES_PER_MB),
                cpu: formatPct(c.cpuAvgPct),
                cpuPeak: formatPct(c.cpuPeakPct),
              },
            }),
          }))}
        />
      )}
    </SectionCard>
  );
}
