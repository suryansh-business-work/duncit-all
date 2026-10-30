import { useApolloClient } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { TUTORIALS_TABLE, type TutorialRow } from './queries';
import TutorialsTable from './TutorialsTable';
import TutorialStatsCard from './TutorialStatsCard';
import { useTutorialCrud } from './useTutorialCrud';
import { useTutorialTopics } from './useTutorialTopics';
import { TutorialForm, blankTutorialValues, toTutorialFormValues } from './tutorial-form';

/** Support → Tutorials → Videos: the short how-to videos members watch from the app menu. */
export default function TutorialsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const topics = useTutorialTopics();
  const crud = useTutorialCrud();
  const fetchRows = useApolloTableFetch<TutorialRow>(client, TUTORIALS_TABLE, 'tutorialsTable');

  const initialValues = crud.editing
    ? toTutorialFormValues(crud.editing)
    : blankTutorialValues(topics.options[0]?.value ?? '');

  return (
    <Stack spacing={2}>
      <PageHeader title={t('support.tutorials.title')} subtitle={t('support.tutorials.subtitle')} />
      <TutorialStatsCard />
      {topics.error && <Alert severity="error">{t('support.tutorials.topicsLoadFailed')}</Alert>}
      <TutorialsTable
        fetchRows={fetchRows}
        refetchRef={crud.refetchRef}
        topicOptions={topics.options}
        labelOfTopic={topics.labelOf}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={crud.openNew}
            data-testid="tutorial-new"
          >
            {t('support.tutorials.newTutorial')}
          </DuncitButton>
        }
        onEdit={crud.openEdit}
        onDelete={(row) => {
          crud.remove(row).catch(() => undefined);
        }}
      />
      <Dialog open={crud.open} onClose={crud.close} fullWidth maxWidth="sm">
        <DialogTitle>{crud.editing ? t('support.tutorials.editTitle') : t('support.tutorials.newTitle')}</DialogTitle>
        <DialogContent dividers>
          <TutorialForm
            key={crud.editing?.id ?? 'new'}
            initialValues={initialValues}
            topicOptions={topics.options}
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
