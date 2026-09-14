import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '../../server/format';
import SectionCard from '../components/SectionCard';
import type { StressRun } from '../queries';
import { formatMs, formatSeconds, journeyLabel } from '../labels';

interface Props {
  run: StressRun;
}

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}

/** What the run was asked to do — the plan the charts above should be read against. */
export default function ProfileCard({ run }: Readonly<Props>) {
  const { t } = useTranslation();
  const p = run.profile;
  const facts = [
    { id: 'users', label: t('tech.stress.fUsers'), value: String(p.virtual_users) },
    { id: 'bots', label: t('tech.stress.fBots'), value: String(p.browser_bots) },
    { id: 'runners', label: t('tech.stress.fRunners'), value: `${run.shards_finished} / ${p.runners}` },
    { id: 'up', label: t('tech.stress.fRampUp'), value: formatSeconds(p.ramp_up_seconds) },
    { id: 'hold', label: t('tech.stress.fHold'), value: formatSeconds(p.hold_seconds) },
    { id: 'down', label: t('tech.stress.fRampDown'), value: formatSeconds(p.ramp_down_seconds) },
    { id: 'think', label: t('tech.stress.fThink'), value: formatMs(p.think_time_ms) },
    { id: 'created', label: t('tech.stress.colWhen'), value: formatDateTime(run.created_at) },
    { id: 'started', label: t('tech.stress.startedAt'), value: formatDateTime(run.started_at) },
    { id: 'ended', label: t('tech.stress.endedAt'), value: formatDateTime(run.ended_at) },
    { id: 'ref', label: t('tech.stress.branch'), value: run.ref || '—' },
  ];

  return (
    <SectionCard title={t('tech.stress.profileTitle')}>
      <Stack spacing={2}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {facts.map((fact) => (
            <Fact key={fact.id} label={fact.label} value={fact.value} />
          ))}
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {p.journeys.map((journey) => (
            <Chip key={journey} size="small" label={journeyLabel(t, journey)} />
          ))}
        </Stack>
      </Stack>
    </SectionCard>
  );
}
