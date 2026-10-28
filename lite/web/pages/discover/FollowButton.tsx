import { useMutation } from '@apollo/client/react';
import type { SxProps, Theme } from '@mui/material/styles';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { mergeSx } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { LiteCalendar } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII } from '../../../shared/tokens';
import { useSignInPrompt } from '../../app/providers/SignInPromptProvider';
import { LITE_SUBSCRIBE_CALENDAR, LITE_UNSUBSCRIBE_CALENDAR } from '../../graphql/calendars';

interface FollowButtonProps {
  calendar: Pick<LiteCalendar, 'id' | 'name' | 'viewer_subscribed'>;
  sx?: SxProps<Theme>;
}

/** Follow / Following for a calendar; a visitor is asked to sign in first. */
export function FollowButton({ calendar, sx }: Readonly<FollowButtonProps>) {
  const { t } = useWebT();
  const { requireSignIn } = useSignInPrompt();
  const [subscribe, subscribing] = useMutation(LITE_SUBSCRIBE_CALENDAR);
  const [unsubscribe, unsubscribing] = useMutation(LITE_UNSUBSCRIBE_CALENDAR);
  const following = calendar.viewer_subscribed;

  const toggle = async () => {
    if (!(await requireSignIn())) return;
    try {
      if (following) await unsubscribe({ variables: { id: calendar.id } });
      else await subscribe({ variables: { id: calendar.id } });
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  return (
    <DuncitButton
      size="small"
      variant={following ? 'outlined' : 'contained'}
      loading={subscribing.loading || unsubscribing.loading}
      aria-pressed={following}
      aria-label={t(following ? 'liteWeb.discover.unfollowNamed' : 'liteWeb.discover.followNamed', { vars: { name: calendar.name } })}
      onClick={() => {
        toggle().catch((error: unknown) => notifyError(parseApiError(error)));
      }}
      sx={mergeSx({ borderRadius: LITE_RADII.pill, minHeight: 30, py: 0.25 }, sx)}
      data-testid="calendar-follow"
    >
      {t(following ? 'liteWeb.discover.following' : 'liteWeb.discover.follow')}
    </DuncitButton>
  );
}
