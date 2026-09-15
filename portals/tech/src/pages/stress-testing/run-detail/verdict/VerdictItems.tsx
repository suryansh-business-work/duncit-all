import { Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { StressVerdictItem } from '../../queries';
import { levelColor, levelLabel } from '../../labels';

interface Props {
  title: string;
  items: readonly StressVerdictItem[];
  emptyText: string;
}

/** One titled list of findings — the bottlenecks, or the upgrades — each with its weight. */
export default function VerdictItems({ title, items, emptyText }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{title}</Typography>
      {items.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {emptyText}
        </Typography>
      )}
      {items.map((item) => (
        <Stack key={`${item.level}|${item.title}`} spacing={0.25}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip size="small" color={levelColor(item.level)} label={levelLabel(t, item.level)} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {item.title}
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {item.detail}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
