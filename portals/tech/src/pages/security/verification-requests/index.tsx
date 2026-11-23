import { useCallback, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import DecisionDialog, { type DecisionTarget } from './DecisionDialog';
import VerificationRequestsTable from './VerificationRequestsTable';
import { PORTAL_SECURITY_EXCEPTIONS_TABLE, type RequestRow } from './queries';

/**
 * Tech → Security → Verification requests: people who could not, or would not,
 * share a location after signing in, and asked an administrator for another way.
 *
 * Approving lets that person through without a position for a limited time.
 * Because that is a way around the check, the decision belongs to a second pair
 * of eyes: the server refuses a reviewer's own request, and refuses a request
 * somebody else already decided.
 */
export default function VerificationRequestsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [target, setTarget] = useState<DecisionTarget | null>(null);
  const fetchRows = useApolloTableFetch<RequestRow>(
    client,
    PORTAL_SECURITY_EXCEPTIONS_TABLE,
    'portalSecurityExceptionsTable',
  );
  const decide = useCallback((request: RequestRow, approve: boolean) => setTarget({ request, approve }), []);
  const close = useCallback(() => setTarget(null), []);
  const reload = useCallback(() => refetchRef.current?.(), []);

  return (
    <Stack spacing={3}>
      <PageHeader title={t('tech.verificationRequests.title')} subtitle={t('tech.verificationRequests.subtitle')} />
      <VerificationRequestsTable fetchRows={fetchRows} refetchRef={refetchRef} onDecide={decide} />
      <DecisionDialog target={target} onClose={close} onDecided={reload} />
    </Stack>
  );
}
