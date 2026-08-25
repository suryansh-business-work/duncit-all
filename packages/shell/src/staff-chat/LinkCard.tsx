import { useQuery } from '@apollo/client';
import { Box, Chip, Link, Skeleton, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import { STAFF_LINK_PREVIEW, type StaffLinkPreview } from './queries';

interface Props {
  url: string;
  /**
   * Navigate inside this app instead of reloading it. Supplied by the portal
   * (react-router's navigate); when the link belongs to a DIFFERENT portal it
   * is not used, because that is a different bundle behind a different door.
   */
  onNavigate?: (path: string) => void;
}

/** Which console this page belongs to, from its own address. */
function currentPortal(): string {
  const host = globalThis.window?.location?.hostname ?? '';
  return host.replace(/^staging\./, '').split('.')[0] ?? '';
}

/**
 * A link, rendered as something you can judge before clicking.
 *
 * An outside link gets its Open Graph card. One of ours gets the console it
 * points at and — the part that saves time — whether YOU can open it: being
 * sent a Finance URL you will bounce off is the most common way a shared link
 * wastes somebody's afternoon.
 *
 * A link into the console you are already in navigates in place. Everything
 * else opens in a new tab, because leaving a conversation to read a link and
 * losing the conversation is the other common way.
 */
export default function LinkCard({ url, onNavigate }: Readonly<Props>) {
  const { data, loading } = useQuery(STAFF_LINK_PREVIEW, {
    variables: { url },
    fetchPolicy: 'cache-first',
  });
  const preview = data?.staffLinkPreview as StaffLinkPreview | undefined;

  if (loading && !preview) {
    return <Skeleton variant="rounded" height={64} sx={{ my: 0.5, maxWidth: 340 }} />;
  }
  if (!preview) {
    return (
      <Link href={url} target="_blank" rel="noreferrer" color="inherit" underline="always">
        {url}
      </Link>
    );
  }

  const sameApp = preview.internal && preview.portal === currentPortal();
  const target = (() => {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  })();

  const open = (event: React.MouseEvent) => {
    if (!sameApp || !onNavigate || !target) return;
    // Same bundle, same session — a full reload here throws away the chat.
    event.preventDefault();
    onNavigate(`${target.pathname}${target.search}${target.hash}`);
  };

  return (
    <Box
      component={Link}
      href={url}
      onClick={open}
      target={sameApp ? undefined : '_blank'}
      rel={sameApp ? undefined : 'noreferrer'}
      underline="none"
      sx={{
        color: "inherit",
        display: 'block',
        my: 0.5,
        maxWidth: 340,
        borderRadius: 1.5,
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        '&:hover': { borderColor: 'primary.main' }
      }}>
      {preview.image && (
        <Box
          component="img"
          src={preview.image}
          alt=""
          loading="lazy"
          sx={{ width: '100%', maxHeight: 150, objectFit: 'cover', display: 'block' }}
        />
      )}
      <Stack spacing={0.5} sx={{ p: 1 }}>
        <Stack direction="row" spacing={0.5} sx={{
          alignItems: "center"
        }}>
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: "text.secondary",
              flex: 1
            }}>
            {preview.internal ? `${preview.portal} console` : (target?.hostname ?? url)}
          </Typography>
          {!sameApp && <OpenInNewIcon sx={{ fontSize: 13, color: 'text.secondary' }} />}
        </Stack>

        {preview.title && (
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
            {preview.title}
          </Typography>
        )}
        {preview.description && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
            {preview.description}
          </Typography>
        )}

        {preview.internal && (
          <Chip
            size="small"
            variant="outlined"
            color={preview.has_access ? 'success' : 'error'}
            icon={preview.has_access ? <CheckCircleIcon /> : <BlockIcon />}
            label={preview.has_access ? 'You have access' : (preview.access_note ?? 'No access')}
            sx={{ alignSelf: 'flex-start', height: 22, fontSize: 11.5 }}
          />
        )}
      </Stack>
    </Box>
  );
}
