import { Stack, Typography } from '@mui/material';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { useTranslation } from '@duncit/app-settings';

/**
 * The account and environment shorthand every Telemetry table renders.
 *
 * Bugs, Error Logs and the four level tables each show "who was signed in" and
 * "which environment", and each had grown its own copy of the label function,
 * the cell and the colour map. Three copies of one rule is three chances for
 * one table to start saying `Anonymous` while its neighbours say `Signed out`
 * (rules 34 / 40).
 */

/** The shape all three telemetry views select for a user; every field nullable. */
export interface TelemetryUserRef {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  roles: string[];
}

/** The machine a telemetry row was captured on; every field nullable. */
export interface TelemetryClientRef {
  app_version: string | null;
  device_model: string | null;
  device_os_version: string | null;
  locale: string | null;
  timezone: string | null;
  screen: string | null;
  viewport: string | null;
  network: string | null;
  referrer: string | null;
}

/** The best name available — falling back to the address, then the raw id. */
export function userLabel(user: TelemetryUserRef | null | undefined): string {
  if (!user?.id) return 'Signed out';
  return user.name ?? user.email ?? user.id;
}

/** The account behind a row, or a plain marker that nobody was signed in. */
export function UserCell({ user }: Readonly<{ user: TelemetryUserRef | null }>) {
  const { t } = useTranslation();
  if (!user?.id) {
    return (
      <Stack direction="row" spacing={0.5} alignItems="center" color="text.disabled">
        <PersonOffIcon fontSize="small" />
        <Typography variant="body2">{t('tech.telemetryIdentity.signedOut')}</Typography>
      </Stack>
    );
  }
  return (
    <Typography variant="body2" noWrap title={user.email ?? user.id}>
      {userLabel(user)}
    </Typography>
  );
}

/** Loud for production, softer for staging, quiet for a developer's machine. */
export const ENV_COLOR: Record<string, 'error' | 'warning' | 'default'> = {
  production: 'error',
  staging: 'warning',
  localhost: 'default',
};

type Translate = ReturnType<typeof useTranslation>['t'];

export const envOptions = (t: Translate) => [
  { value: 'production', label: t('tech.telemetryIdentity.production') },
  { value: 'staging', label: t('tech.telemetryIdentity.staging') },
  { value: 'localhost', label: t('tech.telemetryIdentity.localhost') },
];
