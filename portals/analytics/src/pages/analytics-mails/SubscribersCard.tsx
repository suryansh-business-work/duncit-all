import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { Loader, SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import SubscribersTable from './SubscribersTable';
import SubscriberDialog from './SubscriberDialog';
import { useSubscriberActions } from './useSubscriberActions';
import { ANALYTICS_MAIL_SUBSCRIPTIONS, type AnalyticsMailSubscription } from './queries';

/** Which dialog is open: none, a new subscriber, or one being edited. */
type Editing = { subscriber: AnalyticsMailSubscription | null } | null;

/** The people who receive the report, and the controls to add, change, test or remove them. */
export default function SubscribersCard() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(ANALYTICS_MAIL_SUBSCRIPTIONS, { fetchPolicy: 'cache-and-network' });
  const { onSend, onDelete, sendingId } = useSubscriberActions();
  const [editing, setEditing] = useState<Editing>(null);
  const rows = data?.analyticsMailSubscriptions;

  const add = (
    <DuncitButton
      variant="contained"
      startIcon={<AddIcon />}
      onClick={() => setEditing({ subscriber: null })}
      data-testid="analytics-mail-add"
    >
      {t('analytics.mails.addSubscriber')}
    </DuncitButton>
  );

  let body = <Loader variant="block" />;
  if (rows) {
    body = (
      <SubscribersTable
        rows={rows}
        onSend={onSend}
        onEdit={(subscriber) => setEditing({ subscriber })}
        onDelete={onDelete}
        sendingId={sendingId}
      />
    );
  } else if (error && !loading) {
    body = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => refetch().catch(() => undefined)}>
            {t('analytics.page.retry')}
          </Button>
        }
      >
        {parseApiError(error)}
      </Alert>
    );
  }

  return (
    <SectionCard title={t('analytics.mails.subscribersTitle')} subtitle={t('analytics.mails.subscribersHint')} action={add}>
      <Stack spacing={2}>{body}</Stack>
      {editing && <SubscriberDialog subscriber={editing.subscriber} onClose={() => setEditing(null)} />}
    </SectionCard>
  );
}
