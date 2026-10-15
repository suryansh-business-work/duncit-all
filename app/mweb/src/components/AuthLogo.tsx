import { useState, type ReactNode } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { radii } from '@duncit/auth-tokens';
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
  /**
   * A size × size brand tile with the mark contained in it, whatever the
   * art's shape — a wide wordmark letterboxes on the brand red instead of
   * stretching the header (the auth screens). Native twin: AuthLogo `square`.
   */
  square?: boolean;
}

/**
 * Renders the active branding logo + app name, sourced from the dynamic
 * `branding` server settings. Used on the Login & Register pages.
 */
export default function AuthLogo({ tagline, size = 64, square = false }: Readonly<Props>) {
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
    logoContent = (
      <Skeleton
        data-testid="auth-logo-skeleton"
        variant="rounded"
        width={square ? size : size * 2.5}
        height={size}
      />
    );
  } else {
    const image = (
      <Box
        data-testid="auth-logo-image"
        component="img"
        src={source}
        alt={b?.app_name ?? 'Duncit'}
        onError={() => setFailed(true)}
        sx={
          square
            ? { width: size, height: size, objectFit: 'contain', display: 'block' }
            : { height: size, width: 'auto', maxWidth: size * 4, objectFit: 'contain' }
        }
      />
    );
    logoContent = square ? (
      <Box
        data-testid="auth-logo-tile"
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: `${radii.md}px`,
          bgcolor: 'brand.main',
        }}
      >
        {image}
      </Box>
    ) : (
      image
    );
  }

  return (
    <Stack
      data-testid="auth-logo"
      spacing={1}
      sx={{
        alignItems: "center",
        mb: 1
      }}>
      {logoContent}
      {tagline && (
        <Typography
          data-testid="auth-logo-tagline"
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
