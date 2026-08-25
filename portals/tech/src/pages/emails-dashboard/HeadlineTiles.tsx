import { Stack } from '@mui/material';
import { StatCard } from '@duncit/ui';
import GroupsIcon from '@mui/icons-material/Groups';
import OutboxIcon from '@mui/icons-material/Outbox';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import DoDisturbOnIcon from '@mui/icons-material/DoDisturbOn';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import type { EmailLogDashboardData } from './queries';
import { useTranslation } from '@duncit/app-settings';

const TILE_SX = { flex: 1, minWidth: 200 };

export default function HeadlineTiles({ data }: Readonly<{ data: EmailLogDashboardData }>) {
  const { t } = useTranslation();
  const refusedColor = data.partially_refused > 0 ? 'warning.main' : 'text.secondary';
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{
      flexWrap: "wrap"
    }}>
      <StatCard
        sx={TILE_SX}
        icon={<GroupsIcon fontSize="small" />}
        label={t('tech.emailsDashboard.recipientsAddressed')}
        value={data.recipients.toLocaleString()}
        hint="People addressed, not rows — one bcc batch carries up to fifty of them."
      />
      <StatCard
        sx={TILE_SX}
        icon={<OutboxIcon fontSize="small" />}
        label={t('tech.emailsDashboard.attemptsLogRows')}
        value={data.attempts.toLocaleString()}
        hint="One row per send call, whatever it carried."
      />
      <StatCard
        sx={TILE_SX}
        icon={<MarkEmailReadIcon fontSize="small" />}
        label="SENT"
        value={data.sent.toLocaleString()}
        hint={`${data.partially_refused} refused for some of their addresses`}
        hintColor={refusedColor}
      />
      <StatCard
        sx={TILE_SX}
        icon={<DoDisturbOnIcon fontSize="small" />}
        label="SKIPPED"
        value={data.skipped.toLocaleString()}
        hint="A decision — a template switched off, an address missing."
      />
      <StatCard
        sx={TILE_SX}
        icon={<ErrorOutlineIcon fontSize="small" />}
        label="FAILED"
        value={data.failed.toLocaleString()}
        hint="Refused or errored before anything was handed over."
      />
    </Stack>
  );
}
