import { gql, useQuery } from '@apollo/client';
import { Avatar, Skeleton, Stack, Typography } from '@mui/material';

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
export default function AuthLogo({ tagline }: Props) {
  const { data, loading } = useQuery(AUTH_BRANDING, {
    fetchPolicy: 'cache-first',
  });
  const b = data?.branding;

  return (
    <Stack alignItems="center" spacing={1} sx={{ mb: 1 }}>
      {loading && !b ? (
        <Skeleton variant="circular" width={64} height={64} />
      ) : b?.logo_url ? (
        <Avatar
          src={b.logo_url}
          variant="rounded"
          sx={{
            width: 64,
            height: 64,
            bgcolor: b?.primary_color || 'primary.main',
          }}
        />
      ) : (
        <Avatar
          variant="rounded"
          sx={{
            width: 64,
            height: 64,
            bgcolor: b?.primary_color || 'primary.main',
            fontWeight: 700,
            fontSize: 28,
          }}
        >
          {b?.app_name?.[0] ?? 'D'}
        </Avatar>
      )}
      <Typography variant="h6" fontWeight={700}>
        {b?.app_name ?? 'Duncit'}
      </Typography>
      {tagline && (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {tagline}
        </Typography>
      )}
    </Stack>
  );
}
