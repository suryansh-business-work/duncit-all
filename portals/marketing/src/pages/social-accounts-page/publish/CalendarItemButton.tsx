import { ButtonBase, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { PUBLISH_STATUS_LABEL } from '../copy';
import type { SocialCalendarItem, SocialPublishStatus } from '../publish.queries';

/** The stripe down an entry's edge — paired with the status in its accessible name, never colour alone. */
const STRIPE: Record<SocialPublishStatus, string> = {
  DRAFT: 'text.disabled',
  SCHEDULED: 'info.main',
  PUBLISHING: 'warning.main',
  PUBLISHED: 'success.main',
  PARTIAL: 'warning.main',
  FAILED: 'error.main',
};

interface Props {
  item: SocialCalendarItem;
  onOpen: (item: SocialCalendarItem) => void;
}

/** One post on a calendar day: time, networks and the start of the text. */
export default function CalendarItemButton({ item, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatTime } = useDateFormat({ timeZoneAware: true });
  const time = formatTime(item.at);
  const status = t(PUBLISH_STATUS_LABEL[item.status]);
  const label = `${time} · ${status} · ${item.account_names.join(', ')}: ${item.text}`;

  return (
    <ButtonBase
      onClick={() => onOpen(item)}
      aria-label={label}
      data-testid={`social-calendar-item-${item.id}`}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        textAlign: 'left',
        borderRadius: 1,
        borderLeft: 3,
        borderColor: STRIPE[item.status],
        bgcolor: 'action.hover',
        px: 0.75,
        py: 0.5,
        '&:hover': { bgcolor: 'action.selected' },
        '&.Mui-focusVisible': { outline: 2, outlineColor: 'primary.main' },
      }}
    >
      <Stack spacing={0.25} sx={{ minWidth: 0, width: '100%' }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {time}
          </Typography>
          {item.platforms.map((platform) => (
            <PlatformIcon key={platform} platform={platform} sx={{ fontSize: 14, color: 'text.secondary' }} />
          ))}
        </Stack>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {item.text}
        </Typography>
      </Stack>
    </ButtonBase>
  );
}
