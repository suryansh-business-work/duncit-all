import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import type { OccasionTheme } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { previewPalette, type PreviewMode } from '../preview/palette';
import { WINDOW_COLOR, WINDOW_LABEL, type WindowState } from './scheduleOrder';

interface Props {
  look: OccasionTheme;
  state: WindowState;
  mode: PreviewMode;
  onEdit: (look: OccasionTheme) => void;
}

/** One look's window on the schedule: when, how it stands, its priority, and an edit button. */
export default function ScheduleItem({ look, state, mode, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { palette } = previewPalette(look, mode);
  const span =
    look.starts_at && look.ends_at
      ? t('marketing.occasions.schedule.window', { vars: { from: formatDateTime(look.starts_at), to: formatDateTime(look.ends_at) } })
      : t('marketing.occasions.schedule.noWindow');

  return (
    <Paper
      component="li"
      variant="outlined"
      sx={{
        listStyle: 'none',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* The look's own colours down the edge, so the list reads like a calendar of festivals. */}
      <Box aria-hidden sx={{ width: (th) => th.spacing(1), flexShrink: 0, background: `linear-gradient(180deg, ${palette.brand}, ${palette.primary})` }} />
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 1.5, md: 2 }}
        sx={{ flex: 1, minWidth: 0, p: 2, alignItems: { md: 'center' } }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
            {look.name}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
            <EventRoundedIcon fontSize="small" aria-hidden />
            <Typography variant="body2">{span}</Typography>
          </Stack>
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75, alignItems: 'center' }}>
          <Chip size="small" color={WINDOW_COLOR[state]} label={t(WINDOW_LABEL[state])} />
          <Chip
            size="small"
            variant="outlined"
            color={look.schedule_enabled ? 'success' : 'default'}
            label={t(look.schedule_enabled ? 'marketing.occasions.schedule.on' : 'marketing.occasions.schedule.off')}
          />
          <Chip size="small" variant="outlined" label={t('marketing.occasions.schedule.priorityIs', { vars: { priority: look.sort_order } })} />
        </Stack>
        <DuncitButton
          size="small"
          startIcon={<EditCalendarRoundedIcon />}
          onClick={() => onEdit(look)}
          aria-label={t('marketing.occasions.schedule.editFor', { vars: { name: look.name } })}
        >
          {t('marketing.occasions.schedule.edit')}
        </DuncitButton>
      </Stack>
    </Paper>
  );
}
