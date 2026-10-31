import { ButtonBase, Stack, Tooltip, Typography } from '@mui/material';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { PUBLISH_STATUS_LABEL } from '../copy';
import type { SocialCalendarItem, SocialPublishStatus } from '../publish.queries';

/** The stripe down an entry's edge — paired with the status in its accessible name, never colour alone. */
const STRIPE: Record<SocialPublishStatus, string> = {
  DRAFT: 'text.disabled',
  PENDING_APPROVAL: 'info.main',
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

/** One post on a calendar day: time, networks, how many items a carousel has, and the start of the text. */
export default function CalendarItemButton({ item, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatTime } = useDateFormat({ timeZoneAware: true });
  const time = formatTime(item.at);
  const status = t(PUBLISH_STATUS_LABEL[item.status]);
  const carousel = item.media_count > 1 ? ` · ${t('marketing.social.mediaCount', { count: item.media_count })}` : '';
  const label = `${time} · ${status}${carousel} · ${item.account_names.join(', ')}: ${item.text}`;

  const button = (
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
          {item.media_count > 1 && (
            <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', ml: 'auto', color: 'text.secondary' }} data-testid="social-calendar-item-media">
              <CollectionsOutlinedIcon sx={{ fontSize: 14 }} aria-hidden />
              <Typography variant="caption">{item.media_count}</Typography>
            </Stack>
          )}
        </Stack>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {item.text}
        </Typography>
      </Stack>
    </ButtonBase>
  );

  if (item.status !== 'PENDING_APPROVAL') return button;
  // A description, not a name: the button keeps its own label and the tip explains the stripe.
  return (
    <Tooltip title={t('marketing.social.awaitingApprovalTip')} describeChild>
      {button}
    </Tooltip>
  );
}
