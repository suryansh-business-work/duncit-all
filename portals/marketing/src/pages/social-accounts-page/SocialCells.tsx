import { Stack, Tooltip, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitIconButton } from '@duncit/buttons';
import { EM_DASH } from '@duncit/table';
import PlatformIcon from './PlatformIcon';
import type { SocialPlatform } from './queries';

/** A post or comment's text, held to two lines — the full text is one click away on the network. */
export function ClampedText({ text, secondary }: Readonly<{ text: string | null; secondary?: string | null }>) {
  return (
    <Stack sx={{ py: 0.5, lineHeight: 1.3, minWidth: 0 }}>
      <Typography
        variant="body2"
        component="div"
        sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'normal' }}
      >
        {text || EM_DASH}
      </Typography>
      {secondary && (
        <Typography variant="caption" component="div" noWrap sx={{ color: 'text.secondary' }}>
          {secondary}
        </Typography>
      )}
    </Stack>
  );
}

/** The network's mark beside its name. */
export function PlatformCell({ platform, label }: Readonly<{ platform: SocialPlatform; label: string }>) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', height: '100%' }}>
      <PlatformIcon platform={platform} fontSize="small" sx={{ color: 'text.secondary' }} />
      <span>{label}</span>
    </Stack>
  );
}

/** Opens the thing on its own network, in a new tab. The tooltip is its accessible name. */
export function OpenOnNetwork({ href, title }: Readonly<{ href: string | null; title: string }>) {
  if (!href) return null;
  return (
    <Tooltip title={title}>
      <DuncitIconButton size="small" component="a" href={href} target="_blank" rel="noopener noreferrer">
        <OpenInNewIcon fontSize="small" />
      </DuncitIconButton>
    </Tooltip>
  );
}
