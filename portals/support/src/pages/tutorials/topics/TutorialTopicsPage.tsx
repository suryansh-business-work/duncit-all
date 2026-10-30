import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  useApolloTableFetch,
  type DuncitColumn,
} from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { TUTORIAL_TOPICS_TABLE, type TutorialTopicRow } from '../queries';
import { useTopicCrud } from './useTopicCrud';
import { TopicForm, blankTopicValues, toTopicFormValues } from './topic-form';

const getRowId = (row: TutorialTopicRow) => row.id;

/** Support → Tutorials → Topics: the list members filter tutorials by. */
export default function TutorialTopicsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const crud = useTopicCrud();
  const fetchRows = useApolloTableFetch<TutorialTopicRow>(client, TUTORIAL_TOPICS_TABLE, 'tutorialTopicsTable');
  const { openEdit, remove } = crud;

  const columns = useMemo<DuncitColumn<TutorialTopicRow>[]>(
    () => [
      { field: 'label', headerName: t('support.tutorialTopics.colLabel'), type: 'text', flex: 1, minWidth: 180 },
      { field: 'key', headerName: t('support.tutorialTopics.colKey'), type: 'text', flex: 1, minWidth: 160 },
      { field: 'sort_order', headerName: t('support.tutorialTopics.colOrder'), type: 'number', width: 100 },
      activeChipColumn<TutorialTopicRow>({
        headerName: t('shell.common.status'),
        activeLabel: t('support.tutorialTopics.active'),
        inactiveLabel: t('support.tutorialTopics.hidden'),
      }),
      dateColumn<TutorialTopicRow>({ headerName: t('shell.common.created') }),
      actionsColumn<TutorialTopicRow>({
        headerName: t('shell.common.actions'),
        onEdit: openEdit,
        onDelete: (row) => {
          remove(row).catch(() => undefined);
        },
      }),
    ],
    [t, openEdit, remove],
  );

  return (
    <Stack spacing={2}>
      <PageHeader title={t('support.tutorialTopics.title')} subtitle={t('support.tutorialTopics.subtitle')} />
      <DuncitTable<TutorialTopicRow>
        tableId="support-tutorial-topics"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        toolbarActions={
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={crud.openNew}>
            {t('support.tutorialTopics.newTopic')}
          </DuncitButton>
        }
        emptyText={t('support.tutorialTopics.empty')}
        defaultSort={{ field: 'sort_order', dir: 'asc' }}
        searchPlaceholder={t('support.tutorialTopics.searchPlaceholder')}
        refetchRef={crud.refetchRef}
      />
      <Dialog open={crud.open} onClose={crud.close} fullWidth maxWidth="xs">
        <DialogTitle>
          {crud.editing ? t('support.tutorialTopics.editTitle') : t('support.tutorialTopics.newTitle')}
        </DialogTitle>
        <DialogContent dividers>
          <TopicForm
            key={crud.editing?.id ?? 'new'}
            initialValues={crud.editing ? toTopicFormValues(crud.editing) : blankTopicValues()}
            submitting={crud.saving}
            errorMessage={crud.error}
            onSubmit={(values) => {
              crud.submit(values).catch(() => undefined);
            }}
            onCancel={crud.close}
          />
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
