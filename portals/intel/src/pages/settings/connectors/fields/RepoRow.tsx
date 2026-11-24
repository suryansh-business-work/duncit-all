import { useEffect } from 'react';
import { useController, useWatch, type Control, type UseControllerReturn } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { Alert, IconButton, MenuItem, Paper, Stack, TextField, Tooltip } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import type { IntelGithubRepo } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { RhfSwitch } from '@duncit/forms';
import { isGithubName } from '@duncit/regex';
import { useDebouncedValue } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { INTEL_PICKERS_BRANCHES } from '../../../../graphql/admin';
import type { ConnectorValues } from '../connector-form/connector-form.types';

type Ctl = Control<ConnectorValues, unknown, unknown>;
type Field = UseControllerReturn<ConnectorValues>;

const TOGGLES = [
  { key: 'code', label: 'intel.settings.connectors.repoCode' },
  { key: 'docs', label: 'intel.settings.connectors.repoDocs' },
  { key: 'issues', label: 'intel.settings.connectors.repoIssues' },
  { key: 'prs', label: 'intel.settings.connectors.repoPrs' },
  { key: 'commits', label: 'intel.settings.connectors.repoCommits' },
] as const;

/** A select when the choices are known, a text box when they are not (the list failed, or nothing to pick from yet). */
function PickOrType({ field, label, options, onPick }: Readonly<{ field: Field; label: string; options: readonly string[]; onPick?: (value: string) => void }>) {
  const value = String(field.field.value ?? '');
  const pickable = options.length > 0;
  const choices = pickable && value && !options.includes(value) ? [value, ...options] : options;
  return (
    <TextField
      select={pickable}
      fullWidth
      size="small"
      label={label}
      value={value}
      inputRef={field.field.ref}
      onBlur={field.field.onBlur}
      onChange={(e) => {
        field.field.onChange(e.target.value);
        onPick?.(e.target.value);
      }}
      error={Boolean(field.fieldState.error)}
      helperText={field.fieldState.error?.message ?? ' '}
    >
      {choices.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  );
}

interface Props {
  control: Ctl;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  /** Every repository the token can read; empty while loading or when it could not be listed. */
  repos: readonly IntelGithubRepo[];
}

/** One repository: owner, name and branch — picked from what the token can read — and what to index. */
export default function RepoRow({ control, index, onRemove, canRemove, repos }: Readonly<Props>) {
  const { t } = useTranslation();
  const entryId = useWatch({ control, name: 'env_entry_id' });
  const owner = useController({ control, name: `config.repos.${index}.owner` });
  const repo = useController({ control, name: `config.repos.${index}.repo` });
  const branch = useController({ control, name: `config.repos.${index}.branch` });
  const ownerValue = String(owner.field.value ?? '');
  const owners = [...new Set(repos.map((r) => r.owner))];
  const ownRepos = repos.filter((r) => r.owner === ownerValue);
  const debouncedOwner = useDebouncedValue(ownerValue, 500);
  const debouncedRepo = useDebouncedValue(String(repo.field.value ?? ''), 500);
  const ready = Boolean(entryId) && isGithubName(debouncedOwner) && isGithubName(debouncedRepo);
  const branches = useQuery<{ intelGithubBranches: string[] }>(INTEL_PICKERS_BRANCHES, { variables: { entry_id: entryId, owner: debouncedOwner, repo: debouncedRepo }, skip: !ready });
  const onlyOwner = owners.length === 1 ? owners[0] : '';
  const setOwner = owner.field.onChange;
  // One account behind the token: nothing to choose, so it is chosen.
  useEffect(() => {
    if (onlyOwner && !ownerValue) setOwner(onlyOwner);
  }, [onlyOwner, ownerValue, setOwner]);
  const pickOwner = (next: string) => {
    if (!repos.some((r) => r.owner === next && r.name === repo.field.value)) repo.field.onChange('');
  };
  const pickRepo = (next: string) => {
    const chosen = ownRepos.find((r) => r.name === next);
    if (chosen) branch.field.onChange(chosen.default_branch);
  };
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
        <PickOrType field={owner} label={t('intel.settings.connectors.owner')} options={owners} onPick={pickOwner} />
        <PickOrType field={repo} label={t('intel.settings.connectors.repo')} options={ownRepos.map((r) => r.name)} onPick={pickRepo} />
        <PickOrType field={branch} label={t('intel.settings.connectors.branch')} options={branches.data?.intelGithubBranches ?? []} />
        <Tooltip title={t('intel.settings.connectors.removeRepo')}>
          <span>
            <IconButton aria-label={t('intel.settings.connectors.removeRepo')} onClick={onRemove} disabled={!canRemove}>
              <DeleteOutlinedIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {ready && branches.error && <Alert severity="warning" sx={{ mb: 1 }}>{t('intel.settings.connectors.branchesFailedReason', { vars: { reason: parseApiError(branches.error, '') } })}</Alert>}
      <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2 }}>
        {TOGGLES.map((toggle) => (
          <RhfSwitch key={toggle.key} control={control} name={`config.repos.${index}.${toggle.key}`} label={t(toggle.label)} />
        ))}
      </Stack>
    </Paper>
  );
}
