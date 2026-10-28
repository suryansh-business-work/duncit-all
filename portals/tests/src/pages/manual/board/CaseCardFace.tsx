import { memo } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { CaseTypeIcon } from '../../../components/manual/CaseTypeIcon';
import { PersonAvatar } from '../../../components/manual/PersonAvatar';
import { PriorityIcon } from '../../../components/manual/PriorityIcon';
import type { ManualCard } from '../shared/types';

/** Labels a card shows before folding the rest into "+n". */
const SHOWN_LABELS = 3;

/** A card's due date, in the admin-configured format; red once the day has passed. */
function DueDate({ day }: Readonly<{ day: string }>) {
  const { t } = useTranslation();
  const format = useDateFormat();
  const overdue = day < format.dayKey(format.now());
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: overdue ? 'error.main' : 'text.secondary' }}>
      <EventOutlinedIcon fontSize="inherit" />
      <Typography variant="caption">
        {overdue
          ? t('testsManual.card.overdue', { vars: { date: format.formatDate(day) } })
          : format.formatDate(day)}
      </Typography>
    </Stack>
  );
}

/**
 * What a card shows. Memoized on the card object itself, which Apollo keeps
 * stable until that card changes — dragging one card re-renders no other face.
 */
export const CaseCardFace = memo(function CaseCardFace({ card }: Readonly<{ card: ManualCard }>) {
  const { t } = useTranslation();
  const hidden = card.labels.length - SHOWN_LABELS;
  return (
    <Stack spacing={1} sx={{ p: 1.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
        {card.title}
      </Typography>
      {card.labels.length > 0 ? (
        <Stack direction="row" useFlexGap spacing={0.5} sx={{ flexWrap: 'wrap' }}>
          {card.labels.slice(0, SHOWN_LABELS).map((label) => (
            <Chip key={label} label={label} size="small" variant="outlined" />
          ))}
          {hidden > 0 ? (
            <Chip label={t('testsManual.card.moreLabels', { vars: { count: hidden } })} size="small" />
          ) : null}
        </Stack>
      ) : null}
      {card.due_date ? <DueDate day={card.due_date} /> : null}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <CaseTypeIcon type={card.type} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {card.key}
        </Typography>
        <PriorityIcon priority={card.priority} />
        <Box sx={{ flex: 1 }} />
        {card.assignee ? (
          <PersonAvatar person={card.assignee} />
        ) : (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('testsManual.card.unassigned')}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
});
