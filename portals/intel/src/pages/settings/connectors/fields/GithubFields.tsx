import { useFieldArray, useFormState, useWatch, type Control } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { Alert, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import { INTEL_PICKERS_REPOS, type GithubReposData } from '../../../../graphql/admin';
import type { ConnectorValues } from '../connector-form/connector-form.types';
import RepoRow from './RepoRow';

type Ctl = Control<ConnectorValues, unknown, unknown>;

/** GitHub: the repositories to index and what of each — owners, repositories and branches load from the chosen token. */
export default function GithubFields({ control }: Readonly<{ control: Ctl }>) {
  const { t } = useTranslation();
  const entryId = useWatch({ control, name: 'env_entry_id' });
  const repos = useQuery<GithubReposData>(INTEL_PICKERS_REPOS, { variables: { entry_id: entryId }, skip: !entryId });
  const { fields, append, remove } = useFieldArray({ control, name: 'config.repos' });
  const { errors } = useFormState({ control });
  const listError = (errors.config as { repos?: { message?: string; root?: { message?: string } } } | undefined)?.repos;
  const available = repos.data?.intelGithubRepos ?? [];
  return (
    <Stack spacing={1}>
      {(listError?.root?.message ?? listError?.message) && <Alert severity="error">{listError?.root?.message ?? listError?.message}</Alert>}
      {!entryId && <Alert severity="info">{t('intel.settings.connectors.pickEntryFirst')}</Alert>}
      {repos.error && <Alert severity="warning">{t('intel.settings.connectors.reposFailed', { vars: { reason: parseApiError(repos.error, '') } })}</Alert>}
      {fields.map((field, i) => (
        <RepoRow key={field.id} control={control} index={i} onRemove={() => remove(i)} canRemove={fields.length > 1} repos={available} />
      ))}
      <div>
        <Button startIcon={<AddIcon />} disabled={fields.length >= 20} onClick={() => append({ owner: available.length === 1 ? available[0].owner : '', repo: '', branch: 'main', code: true, docs: true, issues: true, prs: true, commits: true })}>
          {t('intel.settings.connectors.addRepo')}
        </Button>
      </div>
    </Stack>
  );
}
