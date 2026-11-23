import { useFieldArray, useFormState, useWatch, type Control } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { Alert, Button, IconButton, MenuItem, Paper, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from '@duncit/app-settings';
import { RhfSwitch, RhfTextField } from '@duncit/forms';
import { isGithubName } from '@duncit/regex';
import { useDebouncedValue } from '@duncit/ui';
import { INTEL_PICKERS_BRANCHES } from '../../../../graphql/admin';
import type { ConnectorValues } from '../connector-form/connector-form.types';

type Ctl = Control<ConnectorValues, unknown, unknown>;
const TOGGLES = [
  { key: 'code', label: 'intel.settings.connectors.repoCode' },
  { key: 'docs', label: 'intel.settings.connectors.repoDocs' },
  { key: 'issues', label: 'intel.settings.connectors.repoIssues' },
  { key: 'prs', label: 'intel.settings.connectors.repoPrs' },
  { key: 'commits', label: 'intel.settings.connectors.repoCommits' },
] as const;

/** One repository: owner, name, branch (listed live from GitHub when it can be) and what to index. */
function RepoRow({ control, index, onRemove, canRemove }: Readonly<{ control: Ctl; index: number; onRemove: () => void; canRemove: boolean }>) {
  const { t } = useTranslation();
  const entryId = useWatch({ control, name: 'env_entry_id' });
  const owner = useDebouncedValue(String(useWatch({ control, name: `config.repos.${index}.owner` }) ?? ''), 500);
  const repo = useDebouncedValue(String(useWatch({ control, name: `config.repos.${index}.repo` }) ?? ''), 500);
  const ready = Boolean(entryId) && isGithubName(owner) && isGithubName(repo);
  const branches = useQuery<{ intelGithubBranches: string[] }>(INTEL_PICKERS_BRANCHES, { variables: { entry_id: entryId, owner, repo }, skip: !ready });
  const branchList = branches.data?.intelGithubBranches ?? [];
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <RhfTextField control={control} name={`config.repos.${index}.owner`} label={t('intel.settings.connectors.owner')} size="small" />
        <RhfTextField control={control} name={`config.repos.${index}.repo`} label={t('intel.settings.connectors.repo')} size="small" />
        <RhfTextField control={control} name={`config.repos.${index}.branch`} label={t('intel.settings.connectors.branch')} size="small" select={branchList.length > 0}>
          {branchList.map((b) => (
            <MenuItem key={b} value={b}>{b}</MenuItem>
          ))}
        </RhfTextField>
        <Tooltip title={t('intel.settings.connectors.removeRepo')}>
          <span>
            <IconButton aria-label={t('intel.settings.connectors.removeRepo')} onClick={onRemove} disabled={!canRemove}>
              <DeleteOutlinedIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {ready && branches.error && <Alert severity="warning" sx={{ my: 1 }}>{t('intel.settings.connectors.branchesFailed')}</Alert>}
      <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2 }}>
        {TOGGLES.map((toggle) => (
          <RhfSwitch key={toggle.key} control={control} name={`config.repos.${index}.${toggle.key}`} label={t(toggle.label)} />
        ))}
      </Stack>
    </Paper>
  );
}

/** GitHub: the repositories to index and what of each. */
export default function GithubFields({ control }: Readonly<{ control: Ctl }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'config.repos' });
  const { errors } = useFormState({ control });
  const listError = (errors.config as { repos?: { message?: string; root?: { message?: string } } } | undefined)?.repos;
  return (
    <Stack spacing={1}>
      {(listError?.root?.message ?? listError?.message) && <Alert severity="error">{listError?.root?.message ?? listError?.message}</Alert>}
      {fields.map((field, i) => (
        <RepoRow key={field.id} control={control} index={i} onRemove={() => remove(i)} canRemove={fields.length > 1} />
      ))}
      <div>
        <Button startIcon={<AddIcon />} disabled={fields.length >= 20} onClick={() => append({ owner: '', repo: '', branch: 'main', code: true, docs: true, issues: true, prs: true, commits: true })}>
          {t('intel.settings.connectors.addRepo')}
        </Button>
      </div>
    </Stack>
  );
}
