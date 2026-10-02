import { useState } from 'react';
import { Box, Button, ButtonBase, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '@duncit/app-settings';
import type { SocialCalendarItem } from '../publish.queries';
import CalendarItemButton from './CalendarItemButton';
import { dayNumber, dayTitle } from './calendar-grid';

/** How many entries a day shows before it folds the rest behind "+N more". */
const VISIBLE = 3;
const TODAY_SX = { fontWeight: 700, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1, px: 0.75 } as const;

interface Props {
  day: string;
  today: string;
  inMonth: boolean;
  items: SocialCalendarItem[];
  onAdd: (day: string) => void;
  onOpen: (item: SocialCalendarItem) => void;
}

/** One day of the month: its date — a button on days that have not passed — and its posts. */
export default function CalendarDayCell({ day, today, inMonth, items, onAdd, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, VISIBLE);
  const hidden = items.length - shown.length;
  const isToday = day === today;
  const numberColor = inMonth ? 'text.primary' : 'text.secondary';

  return (
    <Box
      role="cell"
      aria-label={dayTitle(day)}
      sx={{
        // Six weeks share whatever the screen has below the header, so the month fills it.
        minHeight: 'max(120px, calc((100dvh - 300px) / 6))',
        p: 0.75,
        borderRight: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: inMonth ? 'background.paper' : 'action.hover',
        minWidth: 0,
      }}
    >
      {day >= today ? (
        <Tooltip title={t('marketing.social.addPostOn', { vars: { day: dayTitle(day) } })}>
          {/* The whole date row is the button: pressing a day starts a post dated that day. */}
          <ButtonBase
            onClick={() => onAdd(day)}
            data-testid={`social-calendar-add-${day}`}
            sx={{ width: '100%', minHeight: 32, justifyContent: 'space-between', borderRadius: 1, px: 0.25, mb: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Typography variant="caption" sx={isToday ? TODAY_SX : { fontWeight: 500, color: numberColor }}>
              {dayNumber(day)}
            </Typography>
            <AddIcon fontSize="small" color="action" />
          </ButtonBase>
        </Tooltip>
      ) : (
        <Typography variant="caption" component="div" sx={{ fontWeight: 500, color: numberColor, minHeight: 32, px: 0.25, mb: 0.5, display: 'flex', alignItems: 'center' }}>
          {dayNumber(day)}
        </Typography>
      )}
      <Stack spacing={0.5}>
        {shown.map((item) => (
          <CalendarItemButton key={`${item.kind}-${item.id}`} item={item} onOpen={onOpen} />
        ))}
        {hidden > 0 && (
          <Button size="small" onClick={() => setExpanded(true)} sx={{ justifyContent: 'flex-start', px: 0.5, minHeight: 0 }}>
            {t('marketing.social.moreItems', { count: hidden })}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
