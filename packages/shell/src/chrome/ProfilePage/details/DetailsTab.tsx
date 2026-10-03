import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '../../../i18n/useTranslation';
import { ProfileLanguage } from '../../ProfileLanguage';
import { ProfileRoles } from '../ProfileRoles';
import { MY_PROFILE_DETAILS, type ProfileDetails } from '../queries';
import { AboutSection } from './AboutSection';
import { VisibilitySection } from './VisibilitySection';

/** The Profile tab: about (photo, name, bio, links), privacy, language, roles. */
export function DetailsTab({ roles }: Readonly<{ roles: readonly string[] }>) {
  const { t } = useTranslation();
  const { data, error, refetch } = useQuery<{ me: ProfileDetails | null }>(MY_PROFILE_DETAILS, {
    fetchPolicy: 'cache-and-network',
  });
  const details = data?.me ?? null;

  return (
    <Stack spacing={2}>
      {error && !details && (
        <Alert severity="error" data-testid="profile-details-error">
          {t('shell.profile.details.loadFailed')}
        </Alert>
      )}
      <AboutSection details={details} onSaved={refetch} />
      <VisibilitySection visibility={details?.profile_visibility ?? null} onChanged={refetch} />
      <ProfileLanguage />
      <ProfileRoles roles={roles} />
    </Stack>
  );
}
