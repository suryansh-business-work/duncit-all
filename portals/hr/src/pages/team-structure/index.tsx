import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import TeamFormDialog, { type TeamFormValues } from './TeamFormDialog';
import TeamsTable from './TeamsTable';
import { DELETE_TEAM_STRUCTURE, SAVE_TEAM_STRUCTURE, TEAM_STRUCTURES } from './queries';
import type { TeamStructureInfo } from './types';

/** HR → Team Structure: every team in a table; a row opens that team's chart. */
export default function TeamStructureListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const query = useQuery<{ teamStructures: TeamStructureInfo[] }>(TEAM_STRUCTURES, { fetchPolicy: 'cache-and-network' });
  const [save, { loading: saving }] = useMutation<{ saveTeamStructure: { id: string } }>(SAVE_TEAM_STRUCTURE);
  const [remove] = useMutation(DELETE_TEAM_STRUCTURE);
  const [form, setForm] = useState<{ team: TeamStructureInfo | null } | null>(null);

  const open = useCallback((team: TeamStructureInfo) => navigate(`/team-structure/${team.id}`), [navigate]);
  const edit = useCallback((team: TeamStructureInfo) => setForm({ team }), []);

  const onDelete = useCallback(
    async (team: TeamStructureInfo) => {
      const ok = await confirm({
        title: t('hr.teamStructure.list.deleteTitle', { vars: { name: team.name } }),
        message: t('hr.teamStructure.list.deleteMessage'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await remove({ variables: { id: team.id } });
        await query.refetch();
      } catch (err) {
        notifyError(parseApiError(err));
      }
    },
    [confirm, remove, query, t],
  );

  const onSubmit = async (values: TeamFormValues) => {
    try {
      const { data } = await save({ variables: { ...values, id: form?.team?.id ?? null, description: values.description || null } });
      setForm(null);
      // A new team goes straight to its empty chart; a rename stays on the list.
      if (!form?.team && data) navigate(`/team-structure/${data.saveTeamStructure.id}`);
      else await query.refetch();
    } catch (err) {
      notifyError(parseApiError(err));
    }
  };

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('hr.teamStructure.list.title')}
        subtitle={t('hr.teamStructure.list.subtitle')}
        actions={<DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setForm({ team: null })}>{t('hr.teamStructure.list.create')}</DuncitButton>}
      />
      <QueryGuard loading={query.loading && !query.data} error={query.error}>
        <TeamsTable rows={query.data?.teamStructures ?? []} onOpen={open} onEdit={edit} onDelete={onDelete} />
      </QueryGuard>
      <TeamFormDialog open={form !== null} team={form?.team ?? null} busy={saving} onClose={() => setForm(null)} onSubmit={onSubmit} />
    </Stack>
  );
}
