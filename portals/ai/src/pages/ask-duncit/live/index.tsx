import { Box } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import ConversationsTable from '../shared/ConversationsTable';
import PageHeader from '../shared/PageHeader';

/** Ask Duncit › Live Conversations — what people are asking right now, refreshed every few seconds. */
export default function AskDuncitLivePage() {
  const { t } = useTranslation();
  return (
    <Box>
      <PageHeader title={t('ai.askDuncit.live.title')} subtitle={t('ai.askDuncit.live.subtitle')} />
      <ConversationsTable live tableId="ai.askDuncit.live" />
    </Box>
  );
}
