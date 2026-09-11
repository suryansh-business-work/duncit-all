import { useState, type ReactNode } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { resolveIconSource } from '@duncit/fallback-icons';
import { FALLBACK_ICONS } from '../fallback-icons';

const AUTH_BRANDING = gql`
  query AuthBranding {
    branding {
      app_name
      logo_url
      mweb_logo_url
      primary_color
    }
  }
`;

interface Props {
  /** Optional tagline rendered below the brand name. */
  tagline?: string;
  /** Logo height in px — the auth hero size by default (native AuthLogo's `size`). */
  size?: number;
}

/**
 * Renders the active branding logo + app name, sourced from the dynamic
 * `branding` server settings. Used on the Login & Register pages.
 */
export default function AuthLogo({ tagline, size = 64 }: Readonly<Props>) {
  const { data, loading } = useQuery<any>(AUTH_BRANDING, {
    fetchPolicy: 'cache-first',
  });
  const b = data?.branding;
  const [failed, setFailed] = useState(false);

  // Admin-managed logo: the mWeb-specific logo wins, then the global one. When
  // neither is set — or the server URL is blank, deleted or unreachable — the
  // BUNDLED copy renders instead, so a logo is never simply absent (rule 39).
  const { source } = resolveIconSource(
    b?.mweb_logo_url || b?.logo_url,
    FALLBACK_ICONS.logo,
    failed,
  );

  let logoContent: ReactNode;
  if (loading && !b) {
    logoContent = <Skeleton variant="rounded" width={size * 2.5} height={size} />;
  } else {
    logoContent = (
      <Box
        component="img"
        src={source}
        alt={b?.app_name ?? 'Duncit'}
        onError={() => setFailed(true)}
        sx={{ height: size, width: 'auto', maxWidth: size * 4, objectFit: 'contain' }}
      />
    );
  }

  return (
    <Stack
      spacing={1}
      sx={{
        alignItems: "center",
        mb: 1
      }}>
      {logoContent}
      {tagline && (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            textAlign: "center"
          }}>
          {tagline}
        </Typography>
      )}
    </Stack>
  );
}
