import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import {
  GIG_JOBS_PATH,
  canPostGigs,
  emptyGigJobValues,
  gigJobPath,
  gigJobToValues,
  parseApiError,
  toGigJobInput,
  type GigJobFormValues,
} from '@duncit/utils';
import { CREATE_GIG_JOB, GIG_JOB, UPDATE_GIG_JOB } from '../documents';
import { useGigSurface } from '../GigSurfaceProvider';
import { useGigContext } from '../useGigContext';
import GigJobForm from './gig-job';

/**
 * Post a gig (no `id`) or edit one of the viewer's own. The server checks the
 * poster's role and ownership again on save — hiding the form is not the gate.
 */
export default function GigJobEditor({ id }: Readonly<{ id?: string }>) {
  const { t } = useTranslation();
  const { go } = useGigSurface();
  const { categories, viewer, loading, error } = useGigContext();
  const existing = useQuery(GIG_JOB, { variables: { id: id ?? '' }, skip: !id });
  const [apiError, setApiError] = useState<string | null>(null);
  const [create, created] = useMutation(CREATE_GIG_JOB, { refetchQueries: ['GigJobs', 'MyGigJobs'] });
  const [update, updated] = useMutation(UPDATE_GIG_JOB);
  const job = existing.data?.gigJob ?? null;
  const title = id ? t('gigJobs.form.editTitle') : t('gigJobs.form.createTitle');

  const submit = async (values: GigJobFormValues) => {
    setApiError(null);
    try {
      const input = toGigJobInput(values);
      if (id) {
        await update({ variables: { id, input } });
        notifySuccess(t('gigJobs.form.saved'));
        go(gigJobPath(id));
        return;
      }
      const res = await create({ variables: { input } });
      notifySuccess(t('gigJobs.form.created'));
      go(res.data ? gigJobPath(res.data.createGigJob.id) : GIG_JOBS_PATH);
    } catch (err) {
      setApiError(parseApiError(err, t('gigJobs.form.saveFailed')));
    }
  };

  const body = () => {
    if (loading || (id && existing.loading && !existing.data)) return <Skeleton variant="rounded" height={480} />;
    if (error || existing.error) return <Alert severity="error">{t('gigJobs.form.loadFailed')}</Alert>;
    if (!canPostGigs(viewer) || (id && !job?.is_mine)) return <Alert severity="info">{t('gigJobs.form.notAllowed')}</Alert>;
    return (
      <GigJobForm
        initialValues={job ? gigJobToValues(job) : emptyGigJobValues(viewer)}
        categories={categories}
        posterRoles={viewer?.poster_roles ?? []}
        editing={!!id}
        busy={created.loading || updated.loading}
        errorMessage={apiError}
        onSubmit={submit}
        onCancel={() => go(id ? gigJobPath(id) : GIG_JOBS_PATH)}
      />
    );
  };

  return (
    <Stack spacing={3} data-testid="gig-editor">
      <Stack spacing={1}>
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('gigJobs.form.intro')}
        </Typography>
      </Stack>
      {body()}
    </Stack>
  );
}
