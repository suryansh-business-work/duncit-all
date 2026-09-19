import { Link as RouterLink } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Box, Link, Stack, Typography } from '@mui/material';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { LiteCalendar } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { useSignInPrompt } from '../../app/providers/SignInPromptProvider';
import { LiteImage } from '../../components/LiteImage';
import { UserAvatar } from '../../components/UserAvatar';
import { LITE_SUBSCRIBE_CALENDAR, LITE_UNSUBSCRIBE_CALENDAR } from '../../graphql/calendars';
import { calendarWebcalUrl } from '../../lib/calendarLinks';
import { paragraphs } from '../../lib/text';
import { paths } from '../../lib/paths';

/** Cover, avatar, name, owner, subscriber count, Subscribe, and the feed for a calendar app. */
export function CalendarHeader({ calendar, onChanged }: Readonly<{ calendar: LiteCalendar; onChanged: () => void }>) {
  const { t } = useWebT();
  const { requireSignIn } = useSignInPrompt();
  const [subscribe, subscribeState] = useMutation(LITE_SUBSCRIBE_CALENDAR);
  const [unsubscribe, unsubscribeState] = useMutation(LITE_UNSUBSCRIBE_CALENDAR);

  const toggle = async () => {
    if (!(await requireSignIn())) return;
    try {
      if (calendar.viewer_subscribed) {
        await unsubscribe({ variables: { id: calendar.id } });
        notifySuccess(t('liteWeb.calendar.unsubscribed'));
      } else {
        await subscribe({ variables: { id: calendar.id } });
        notifySuccess(t('liteWeb.calendar.subscribed'));
      }
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const busy = subscribeState.loading || unsubscribeState.loading;
  return (
    <Stack spacing={2} data-testid="calendar-header">
      {calendar.cover_url ? <LiteImage src={calendar.cover_url} alt="" width={1200} height={400} eager sx={{ borderRadius: 4 }} /> : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <UserAvatar name={calendar.name} url={calendar.avatar_url} size={72} />
        <Box sx={{ flexGrow: 1 }}>
          <PageHeader
            title={calendar.name}
            titleVariant="h4"
            subtitle={
              <>
                {t('liteWeb.calendar.by')}{' '}
                <Link component={RouterLink} to={paths.user(calendar.owner.handle)} sx={{ fontWeight: 700 }} data-testid="calendar-owner">
                  {calendar.owner.name}
                </Link>
                {' · '}
                {t('liteWeb.discover.subscribers', { count: calendar.subscriber_count })}
                {calendar.city_name ? ` · ${calendar.city_name}` : ''}
              </>
            }
          />
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {calendar.viewer_is_owner ? (
            <DuncitButton component={RouterLink} to={paths.calendarEdit(calendar.id)} variant="outlined" data-testid="calendar-edit">
              {t('lite.common.edit')}
            </DuncitButton>
          ) : (
            <DuncitButton variant={calendar.viewer_subscribed ? 'outlined' : 'contained'} onClick={toggle} loading={busy} data-testid="calendar-subscribe">
              {calendar.viewer_subscribed ? t('liteWeb.calendar.unsubscribe') : t('liteWeb.calendar.subscribe')}
            </DuncitButton>
          )}
          <DuncitButton component="a" href={calendarWebcalUrl(calendar.slug)} variant="text" startIcon={<RssFeedIcon />} data-testid="calendar-webcal">
            {t('liteWeb.calendar.subscribeInApp')}
          </DuncitButton>
        </Stack>
      </Stack>
      {calendar.description ? paragraphs(calendar.description).map((block) => <Typography key={block.slice(0, 40)}>{block}</Typography>) : null}
    </Stack>
  );
}
