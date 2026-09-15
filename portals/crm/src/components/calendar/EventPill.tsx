import { useId } from 'react';
import { ButtonBase, Tooltip } from '@mui/material';
import { format } from 'date-fns';
import { useTranslation } from '@duncit/shell';
import type { CalEvent } from './useCalendarEvents';

interface Props {
  event: CalEvent;
  onClick: (e: CalEvent) => void;
  showTime?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Read by screen readers, never painted. */
const SR_ONLY = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

type Translate = ReturnType<typeof useTranslation>['t'];

/** Colour by urgency: overdue/now = red, within 24h = yellow, later = green.
 * `label` says the same thing in words, so urgency is never colour alone (1.4.1). */
function urgencyTone(date: Date, done: boolean, t: Translate): { bg: string; fg: string; label: string } {
  if (done) return { bg: 'action.disabledBackground', fg: 'text.secondary', label: t('crm.components.done') };
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return { bg: 'error.main', fg: 'error.contrastText', label: t('crm.a11y.overdue') };
  if (diff <= DAY_MS) return { bg: 'warning.main', fg: 'warning.contrastText', label: t('crm.a11y.dueSoon') };
  return { bg: 'success.main', fg: 'success.contrastText', label: t('crm.components.upcoming') };
}

/** Compact clickable event chip; colour encodes urgency (and done state). */
export default function EventPill({ event, onClick, showTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const urgencyId = useId();
  const done = event.status === 'DONE';
  const { bg, fg, label } = urgencyTone(event.date, done, t);
  return (
    <Tooltip title={`${format(event.date, 'p')} · ${event.title}`}>
      <ButtonBase
        onClick={(e) => { e.stopPropagation(); onClick(event); }}
        aria-describedby={urgencyId}
        data-testid="crm-calendar-event-pill"
        sx={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          font: 'inherit',
          bgcolor: bg,
          color: fg,
          borderRadius: 0.75,
          px: 0.5,
          py: 0.125,
          fontSize: 11,
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {showTime ? `${format(event.date, 'p')} ` : ''}{event.title}
        <span id={urgencyId} style={SR_ONLY}>{label}</span>
      </ButtonBase>
    </Tooltip>
  );
}
