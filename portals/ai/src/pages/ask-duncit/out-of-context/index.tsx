import { Box } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import AuditTable from '../shared/AuditTable';
import PageHeader from '../shared/PageHeader';

/** Ask Duncit › Out-of-Context Queries — questions that were not about Duncit, flagged by the assistant or the evaluator. */
export default function AskDuncitOutOfContextPage() {
  const { t } = useTranslation();
  return (
    <Box>
      <PageHeader title={t('ai.askDuncit.ooc.title')} subtitle={t('ai.askDuncit.ooc.subtitle')} />
      <AuditTable preset="OUT_OF_CONTEXT" tableId="ai.askDuncit.ooc" />
    </Box>
  );
}
