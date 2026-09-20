import { useQuery } from '@apollo/client/react';
import { Navigate, useParams } from 'react-router';
import { Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { AutomationFlowForm } from '../../../forms/automation-flow';
import { AUTOMATION_FLOWS } from '../queries';
import { channelFromSlug, type AutomationFlow } from '../types';
import FlowsTable from './FlowsTable';
import { useFlowActions } from './useFlowActions';

const EMPTY: AutomationFlow[] = [];

/**
 * Automation > WhatsApp / Email — the flows on one channel.
 *
 * One page for both channels, keyed by the route: the list is the same table
 * whichever it shows, and the channel only changes the title and what the
 * builder offers once a row is opened.
 */
export default function AutomationFlowsPage() {
  const { channel: slug } = useParams<{ channel: string }>();
  const channel = channelFromSlug(slug);
  if (!channel) return <Navigate to="/" replace />;
  return <FlowsPage channel={channel} />;
}

function FlowsPage({ channel }: Readonly<{ channel: NonNullable<ReturnType<typeof channelFromSlug>> }>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ automationFlows: AutomationFlow[] }>(AUTOMATION_FLOWS, {
    variables: { channel },
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.automationFlows ?? EMPTY;
  const actions = useFlowActions(channel, () => {
    refetch().catch(() => undefined);
  });
  const whatsapp = channel === 'WHATSAPP';

  return (
    <Box>
      <PageHeader
        title={whatsapp ? t('ai.automation.list.titleWhatsapp') : t('ai.automation.list.titleEmail')}
        subtitle={whatsapp ? t('ai.automation.list.subtitleWhatsapp') : t('ai.automation.list.subtitleEmail')}
        actions={
          <DuncitButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => actions.setCreateOpen(true)}
            data-testid="automation-new-flow"
          >
            {t('ai.automation.list.newFlow')}
          </DuncitButton>
        }
        sx={{ mb: 2 }}
      />
      <QueryGuard loading={loading && !data} error={error}>
        <FlowsTable
          channel={channel}
          rows={rows}
          onOpen={actions.open}
          onDuplicate={actions.copy}
          onDelete={actions.destroy}
        />
      </QueryGuard>
      <AutomationFlowForm
        open={actions.createOpen}
        submitting={actions.creating}
        onClose={() => actions.setCreateOpen(false)}
        onSubmit={actions.create}
      />
    </Box>
  );
}
