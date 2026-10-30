import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import {
  CREATE_TUTORIAL_TOPIC,
  DELETE_TUTORIAL_TOPIC,
  TUTORIAL_TOPICS,
  UPDATE_TUTORIAL_TOPIC,
  type TutorialTopicRow,
} from '../queries';
import { saveErrorMessage } from '../errors';
import { toTopicInput, type TopicFormOutput } from './topic-form';

/** Create / edit / delete wiring for the topics table. Every write refreshes the
 * topic list the Videos page's select and filter read. */
export function useTopicCrud() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const [editing, setEditing] = useState<TutorialTopicRow | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refetchTopics = { refetchQueries: [{ query: TUTORIAL_TOPICS }] };
  const [createTopic, createState] = useMutation(CREATE_TUTORIAL_TOPIC, refetchTopics);
  const [updateTopic, updateState] = useMutation(UPDATE_TUTORIAL_TOPIC, refetchTopics);
  const [deleteTopic] = useMutation(DELETE_TUTORIAL_TOPIC, refetchTopics);

  const openDialog = useCallback((row: TutorialTopicRow | null) => {
    setEditing(row);
    setError(null);
    setOpen(true);
  }, []);

  const submit = async (values: TopicFormOutput) => {
    setError(null);
    const input = toTopicInput(values);
    try {
      if (editing) await updateTopic({ variables: { topic_id: editing.id, input } });
      else await createTopic({ variables: { input } });
      setOpen(false);
      notifySuccess(editing ? t('support.tutorialTopics.updated') : t('support.tutorialTopics.created'));
      refetchRef.current?.();
    } catch (cause) {
      setError(saveErrorMessage(cause, t('support.tutorialTopics.saveFailed')));
    }
  };

  const remove = useCallback(
    async (row: TutorialTopicRow) => {
      const confirmed = await confirm({
        title: t('support.tutorialTopics.deleteTitle'),
        message: t('support.tutorialTopics.deleteBody'),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!confirmed) return;
      try {
        await deleteTopic({ variables: { topic_id: row.id } });
        notifySuccess(t('support.tutorialTopics.deleted'));
        refetchRef.current?.();
      } catch (cause) {
        notifyError(saveErrorMessage(cause, t('support.tutorialTopics.deleteFailed')));
      }
    },
    [confirm, deleteTopic, t],
  );

  return {
    refetchRef,
    editing,
    open,
    error,
    saving: createState.loading || updateState.loading,
    close: () => setOpen(false),
    openNew: () => openDialog(null),
    openEdit: openDialog,
    submit,
    remove,
  };
}
