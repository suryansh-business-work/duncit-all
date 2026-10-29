import { useCallback, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { HEALTH_APPEALS_TABLE, type HealthAppeal } from '../../graphql/healthAppeals';
import type { AppealDecision } from './appeal-decision-form';
import HealthAppealsTable from './HealthAppealsTable';
import HealthAppealDecisionDialog, { type PendingAppealDecision } from './HealthAppealDecisionDialog';

/**
 * Legal > Account Health Appeals — every health deduction a host, venue owner
 * or member appealed from the app or mWeb. Accepting gives the points back and
 * denying keeps the deduction; the person is told either way, in the app and
 * by email, from the server.
 */
export default function HealthAppealsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  // Admin-configured format and time zone, so "Submitted" reads the same here
  // as it does everywhere else in the platform.
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const fetchRows = useApolloTableFetch<HealthAppeal>(client, HEALTH_APPEALS_TABLE, 'healthAppealsTable');
  const [pending, setPending] = useState<PendingAppealDecision | null>(null);

  const onDecide = useCallback(
    (appeal: HealthAppeal, decision: AppealDecision) => setPending({ appeal, decision }),
    [],
  );

  const onDone = (message: string) => {
    notifySuccess(message);
    refetchRef.current?.();
  };

  return (
    <Stack spacing={2} data-testid="legal-health-appeals">
      <PageHeader title={t('healthAppeals.pageTitle')} subtitle={t('healthAppeals.pageSubtitle')} />
      <HealthAppealsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDateTime={formatDateTime}
        onDecide={onDecide}
      />
      <HealthAppealDecisionDialog pending={pending} onClose={() => setPending(null)} onDone={onDone} />
    </Stack>
  );
}
