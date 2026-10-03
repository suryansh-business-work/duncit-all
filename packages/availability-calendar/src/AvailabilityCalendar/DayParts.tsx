import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { format } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import { formatDate } from '@duncit/datetime';
import { TODAY_TONE, type Bucket } from './helpers';

interface BadgeProps {
  count: number;
  selected: boolean;
  label: string;
  bg: string;
  fg: string;
}

function CountBadge({ count, selected, label, bg, fg }: Readonly<BadgeProps>) {
  if (count <= 0) return null;
  return (
    <Box
      sx={{
        px: 0.5,
        py: 0,
        borderRadius: 0.5,
        bgcolor: selected ? (theme) => alpha(theme.palette.common.white, 0.25) : bg,
        color: selected ? 'primary.contrastText' : fg,
        fontSize: 10,
        fontWeight: 800,
      }}
    >
      {count}
      {label}
    </Box>
  );
}

interface DayHeaderProps {
  date: Date;
  isDayView: boolean;
  isToday: boolean;
  /** Paint the number in the gold today tone (false when selection or leave colours the tile). */
  isTodayAccent?: boolean;
  isHoliday: boolean;
}

/** The day number (or full date in day view) plus the venue-leave tag. */
export function DayHeader({ date, isDayView, isToday, isTodayAccent = false, isHoliday }: Readonly<DayHeaderProps>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      sx={{
        justifyContent: "space-between",
        alignItems: "center"
      }}>
      <Typography
        variant="body2"
        sx={{
          fontWeight: isToday ? 900 : 600,
          textDecoration: isToday ? 'underline' : 'none',
          color: isTodayAccent ? TODAY_TONE : 'inherit',
        }}
      >
        {isDayView ? formatDate(date) : format(date, 'd')}
      </Typography>
      {isHoliday && !isDayView && (
        <Typography
          variant="caption"
          sx={{ fontSize: 9, fontWeight: 800 }}
          aria-label={t('availability.onLeave')}
        >
          {t('availability.leaveTag')}
        </Typography>
      )}
    </Stack>
  );
}

interface DayBadgesProps {
  bucket?: Bucket;
  isSelected: boolean;
}

/** The A/P/B/× slot counts for a day; renders nothing when the day has no slots. */
export function DayBadges({ bucket, isSelected }: Readonly<DayBadgesProps>) {
  if (!bucket) return null;
  return (
    <Stack
      direction="row"
      spacing={0.25}
      sx={{
        flexWrap: "wrap",
        rowGap: 0.25
      }}>
      <CountBadge count={bucket.available} selected={isSelected} label="A" bg="success.main" fg="success.contrastText" />
      <CountBadge count={bucket.pending} selected={isSelected} label="P" bg="info.main" fg="info.contrastText" />
      <CountBadge count={bucket.booked} selected={isSelected} label="B" bg="warning.main" fg="warning.contrastText" />
      {/* grey.300 never darkens in dark mode, so its fg must be a fixed grey
          too — text.secondary would go light-on-light here. */}
      <CountBadge count={bucket.blocked} selected={isSelected} label="×" bg="grey.300" fg="grey.800" />
    </Stack>
  );
}
