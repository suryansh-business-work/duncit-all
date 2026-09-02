import type { ReactNode } from 'react';
import { Alert, Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import {
  AUTO_POD_AUDIENCE_ROLES,
  audienceCount,
  type AutoPodAudience,
  type AutoPodAudienceRole,
} from './audience-queries';
import { useTranslation, type Translate } from '../i18n/useTranslation';

interface CountCardProps {
  role: AutoPodAudienceRole;
  label: string;
  /** Null while nothing has been counted yet (no category, or still loading). */
  count: number | null;
  icon: ReactNode;
  onOpen: (role: AutoPodAudienceRole) => void;
}

/** One count, as a button: pressing it opens the drawer listing who is behind it. */
function CountCard({ role, label, count, icon, onOpen }: Readonly<CountCardProps>) {
  const zero = count === 0;
  const shown = count === null ? '—' : String(count);
  const tone = zero ? 'error.main' : 'primary.main';
  return (
    <Card variant="outlined" sx={{ flex: 1, borderColor: zero ? 'error.main' : 'divider' }}>
      <CardActionArea
        onClick={() => onOpen(role)}
        disabled={count === null}
        aria-label={`${label}: ${shown}`}
        data-testid={`auto-pod-audience-${role}`}
        sx={{ p: 2 }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box sx={{ color: tone, display: 'flex' }}>{icon}</Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1, color: zero ? tone : 'text.primary' }}>
              {shown}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

/** The card labels, and the words the "nobody yet" warning names each role by. */
function roleCopy(t: Translate) {
  const labels: Record<AutoPodAudienceRole, string> = {
    venues: t('podForm.autoPod.audienceVenues'),
    hosts: t('podForm.autoPod.audienceHosts'),
    club_admins: t('podForm.autoPod.audienceClubAdmins'),
  };
  const nouns: Record<AutoPodAudienceRole, string> = {
    venues: t('podForm.autoPod.audienceRoleVenues'),
    hosts: t('podForm.autoPod.audienceRoleHosts'),
    club_admins: t('podForm.autoPod.audienceRoleClubAdmins'),
  };
  return { labels, nouns };
}

const ICONS: Record<AutoPodAudienceRole, ReactNode> = {
  venues: <StorefrontIcon />,
  hosts: <PersonIcon />,
  club_admins: <GroupsIcon />,
};

export interface AutoPodAudienceCountsProps {
  audience: AutoPodAudience | null;
  loading: boolean;
  error: string | null;
  onOpen: (role: AutoPodAudienceRole) => void;
}

/**
 * How many venues, hosts and club admins could enrol in the chosen category —
 * three counts the admin sees the moment the sub-category is picked, each a
 * button that opens the list behind it. A zero is drawn in red and named in
 * the warning below, because an offer nobody can complete never goes live.
 */
export default function AutoPodAudienceCounts({
  audience,
  loading,
  error,
  onOpen,
}: Readonly<AutoPodAudienceCountsProps>) {
  const { t } = useTranslation();
  const { labels, nouns } = roleCopy(t);
  const missing = audience
    ? AUTO_POD_AUDIENCE_ROLES.filter((role) => audienceCount(audience, role) === 0)
    : [];
  const blocked =
    missing.length > 0
      ? t('podForm.autoPod.audienceBlocked', {
          vars: { roles: missing.map((role) => nouns[role]).join(', ') },
        })
      : null;

  return (
    <Stack spacing={1.5} data-testid="auto-pod-audience">
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('podForm.autoPod.audienceTitle')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('podForm.autoPod.audienceHint')}
        </Typography>
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        {AUTO_POD_AUDIENCE_ROLES.map((role) => (
          <CountCard
            key={role}
            role={role}
            label={labels[role]}
            count={audience ? audienceCount(audience, role) : null}
            icon={ICONS[role]}
            onOpen={onOpen}
          />
        ))}
      </Stack>
      {loading && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('podForm.autoPod.audienceLoading')}
        </Typography>
      )}
      {error && <Alert severity="error">{t('podForm.autoPod.audienceError')}</Alert>}
      {blocked && <Alert severity="warning">{blocked}</Alert>}
    </Stack>
  );
}
