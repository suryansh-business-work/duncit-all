import { Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { buildUsernameLabels, profileUrl } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { notifySuccess } from '../../components/notify';

interface Props {
  /** The server-minted @handle, or null for an account that predates them. */
  username: string | null;
  /** What the line falls back to when there is no handle yet. */
  fallback: string;
}

/**
 * The `@handle` under the name on your own profile — and the button that
 * copies the link it makes.
 *
 * The link belongs HERE rather than in Profile Settings. The handle is CHANGED
 * in Edit profile, beside the name it belongs to; what somebody wants from it
 * on the profile is to send it to a friend, and they go looking for that next
 * to the name and the Share button — not three screens into their account.
 */
export default function ProfileHandleLink({ username, fallback }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildUsernameLabels(t);

  if (!username) {
    return (
      <Typography
        variant="body2"
        noWrap
        sx={{
          color: "text.secondary",
          fontWeight: 600
        }}>
        {fallback}
      </Typography>
    );
  }

  const link = profileUrl(globalThis.window.location.origin, username);
  const copy = () => {
    navigator.clipboard
      .writeText(link)
      .then(() => notifySuccess(labels.linkCopied))
      .catch((error) => logs.mWeb.warn('ProfileHandleLink', 'copyLink', { error }));
  };

  return (
    <Tooltip title={labels.copyLink}>
      <Stack
        component="button"
        type="button"
        onClick={copy}
        direction="row"
        spacing={0.5}
        aria-label={labels.copyLink}
        sx={{
          alignItems: "center",
          justifyContent: "center",

          // A flex element is block-level, so it would fill the card and the
          // hover fill would span it — `fit-content` keeps the target the
          // size of the handle it is on.
          width: 'fit-content',

          mx: 'auto',
          px: 1,
          py: 0.25,
          border: 0,
          borderRadius: 999,
          cursor: 'pointer',
          bgcolor: 'transparent',
          color: 'text.secondary',
          font: 'inherit',
          '&:hover': { bgcolor: 'action.hover' }
        }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {labels.handle(username)}
        </Typography>
        <ContentCopyIcon sx={{ fontSize: 14 }} />
      </Stack>
    </Tooltip>
  );
}
