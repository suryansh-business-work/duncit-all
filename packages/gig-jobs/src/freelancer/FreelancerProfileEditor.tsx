import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import {
  GIG_JOBS_PATH,
  freelancerToValues,
  parseApiError,
  toFreelancerInput,
  type FreelancerFormValues,
} from '@duncit/utils';
import { MY_FREELANCER_PROFILE, SAVE_FREELANCER_PROFILE } from '../documents';
import { useGigSurface } from '../GigSurfaceProvider';
import { useGigContext } from '../useGigContext';
import { useLoggedError } from '../useLoggedError';
import FreelancerProfileForm from './freelancer-profile';

/**
 * Earn with Duncit's freelancer step — self-serve, no meeting. Saving grants
 * the FREELANCER role, so the Earn card turns to "Already enabled" and every
 * gig offers "I'm interested". `EarnMe` is refetched for exactly that.
 */
export default function FreelancerProfileEditor() {
  const { t } = useTranslation();
  const { go } = useGigSurface();
  const { categories, viewer, loading, error } = useGigContext();
  const profile = useQuery(MY_FREELANCER_PROFILE, { fetchPolicy: 'cache-and-network' });
  useLoggedError(profile.error, 'freelancer-profile', 'loadProfile');
  const [save, saving] = useMutation(SAVE_FREELANCER_PROFILE, { refetchQueries: ['GigViewer', 'EarnMe'] });
  const [apiError, setApiError] = useState<string | null>(null);
  const existing = profile.data?.myFreelancerProfile ?? null;

  const submit = async (values: FreelancerFormValues) => {
    setApiError(null);
    try {
      await save({ variables: { input: toFreelancerInput(values, categories) } });
      notifySuccess(existing ? t('gigJobs.freelancer.saved') : t('gigJobs.freelancer.joined'));
      go(GIG_JOBS_PATH);
    } catch (err) {
      setApiError(parseApiError(err, t('gigJobs.freelancer.saveFailed')));
    }
  };

  const ready = !loading && !(profile.loading && !profile.data);
  const failed = error || (profile.error && !profile.data);

  return (
    <Stack spacing={3} data-testid="freelancer-editor">
      <Stack spacing={1}>
        <Typography variant="h5" component="h1">
          {t('gigJobs.freelancer.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('gigJobs.freelancer.intro')}
        </Typography>
      </Stack>
      {existing && (
        <DuncitButton variant="outlined" onClick={() => go(GIG_JOBS_PATH)} sx={{ alignSelf: 'flex-start' }}>
          {t('gigJobs.freelancer.browse')}
        </DuncitButton>
      )}
      {failed && <Alert severity="error">{t('gigJobs.freelancer.loadFailed')}</Alert>}
      {!failed && !ready && <Skeleton variant="rounded" height={480} />}
      {!failed && ready && (
        <FreelancerProfileForm
          key={existing?.id ?? 'new'}
          initialValues={freelancerToValues(existing, viewer?.default_contact)}
          categories={categories}
          joined={!!existing}
          busy={saving.loading}
          errorMessage={apiError}
          onSubmit={submit}
        />
      )}
    </Stack>
  );
}
