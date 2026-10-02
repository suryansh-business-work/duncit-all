import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import type { ReelProjectFormValues } from '../../../forms/reel-project';
import { CREATE_REEL_PROJECT, DELETE_REEL_PROJECT } from '../queries';
import type { ReelProjectSummary } from '../types';

/** Create and delete from the list. A new reel opens straight in the studio. */
export function useProjectActions(refetch: () => void) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  const [createProject, { loading: creating }] = useMutation<{ createReelProject: { id: string } }>(CREATE_REEL_PROJECT);
  const [deleteProject] = useMutation<{ deleteReelProject: boolean }>(DELETE_REEL_PROJECT);

  const open = useCallback((project: ReelProjectSummary) => navigate(`/reels/${project.id}`), [navigate]);

  const create = useCallback(
    async (values: ReelProjectFormValues) => {
      try {
        const result = await createProject({ variables: { input: values } });
        const id = result.data?.createReelProject.id;
        notifySuccess(t('ai.reels.list.created'));
        setCreateOpen(false);
        if (id) navigate(`/reels/${id}`);
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.list.saveFailed')));
      }
    },
    [createProject, navigate, t]
  );

  const destroy = useCallback(
    async (project: ReelProjectSummary) => {
      const ok = await confirm({
        title: t('ai.reels.list.deleteTitle'),
        message: t('ai.reels.list.deleteMessage', { vars: { name: project.name } }),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteProject({ variables: { id: project.id } });
        notifySuccess(t('ai.reels.list.deleted'));
        refetch();
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.list.saveFailed')));
      }
    },
    [confirm, deleteProject, refetch, t]
  );

  return { createOpen, setCreateOpen, creating, create, open, destroy };
}
