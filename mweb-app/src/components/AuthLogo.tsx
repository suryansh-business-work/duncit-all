import { gql, useQuery } from '@apollo/client';
import { Box, Skeleton, Stack, Typography } from '@mui/material';

const AUTH_BRANDING = gql`
  query AuthBranding {
    branding {
      app_name
      logo_url
      primary_color
    }
  }
`;

interface Props {
  /** Optional tagline rendered below the brand name. */
  tagline?: string;
}

/**
 * Renders the active branding logo + app name, sourced from the dynamic
 * `branding` server settings. Used on the Login & Register pages.
 */
export default function AuthLogo({ tagline }: Readonly<Props>) {
  const { data, loading } = useQuery(AUTH_BRANDING, {
    fetchPolicy: 'cache-first',
  });
  const b = data?.branding;

  // Always prefer the bundled brand SVG so the auth screen never shows a
  // letter-fallback when branding hasn't loaded yet. The dynamic logo from
  // settings overrides only when explicitly configured.
  const logoSrc = b?.logo_url || '/duncit-logo.svg';

  return (
    <Stack alignItems="center" spacing={1} sx={{ mb: 1 }}>
      {loading && !b ? (
        <Skeleton variant="rounded" width={148} height={48} />
      ) : (
        <Box
          component="img"
          src={logoSrc}
          alt={b?.app_name ?? 'Duncit'}
          sx={{ height: 58, width: 'auto', maxWidth: 180, objectFit: 'contain' }}
        />
      )}
      {tagline && (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {tagline}
        </Typography>
      )}
    </Stack>
  );
}
