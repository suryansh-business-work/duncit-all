import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useApolloTableFetch, type DuncitColumnOption } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import {
  CONTENT_REPORTS_TABLE,
  REPORT_CATEGORIES_TABLE,
  type ContentReport,
  type ReportCategory,
} from '../../../graphql/reports';
import ReportedContentTable from './ReportedContentTable';
import ReportDetailDialog from './ReportDetailDialog';
import ReportDecisionDialog, { type PendingDecision } from './ReportDecisionDialog';
import ReportMailDialog, { type PendingMail } from './ReportMailDialog';
import type { ReportActionHandlers } from './ReportRowActions';

interface CategoriesData {
  reportCategoriesTable: { rows: ReportCategory[] };
}

/** Every category in one page — the Reason filter lists them all, switched off or not. */
const ALL_CATEGORIES = { query: { page: 1, page_size: 100 } };

/**
 * UGC Monitoring > Reported content — every post and story users have reported.
 *
 * One queue rather than one per content type: a report is a report, and a
 * reviewer should not have to know which screen it came from to find it. Each
 * row carries the four things a reviewer does about one — take the content
 * down, rule that it is fine, write to the reporter, write to the owner.
 */
export default function ReportedContentTab() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  // Admin-configured format and time zone, so "Received" reads the same here
  // as it does everywhere else in the platform.
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });

  const fetchRows = useApolloTableFetch<ContentReport>(
    client,
    CONTENT_REPORTS_TABLE,
    'contentReportsTable',
  );

  const { data } = useQuery<CategoriesData>(REPORT_CATEGORIES_TABLE, {
    variables: ALL_CATEGORIES,
    fetchPolicy: 'cache-and-network',
  });
  const reasonOptions = useMemo<DuncitColumnOption[]>(
    () =>
      (data?.reportCategoriesTable.rows ?? []).map((category) => ({
        value: category.key,
        label: category.label,
      })),
    [data],
  );

  const [open, setOpen] = useState<ContentReport | null>(null);
  const [decision, setDecision] = useState<PendingDecision | null>(null);
  const [mail, setMail] = useState<PendingMail | null>(null);

  // An action started from the detail dialog replaces it rather than stacking
  // a second dialog on top: the report it showed is about to change.
  const handlers = useMemo<ReportActionHandlers>(
    () => ({
      onOpen: setOpen,
      onDecide: (report, verdict) => {
        setOpen(null);
        setDecision({ report, decision: verdict });
      },
      onMail: (report, recipient) => {
        setOpen(null);
        setMail({ report, recipient });
      },
    }),
    [],
  );

  const changed = (message: string) => {
    notifySuccess(message);
    refetchRef.current?.();
  };

  return (
    <Stack spacing={2} data-testid="ugc-reported-tab">
      <ReportedContentTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDateTime={formatDateTime}
        reasonOptions={reasonOptions}
        handlers={handlers}
      />

      <ReportDetailDialog
        report={open}
        formatDateTime={formatDateTime}
        handlers={handlers}
        onClose={() => setOpen(null)}
        onSaved={() => changed(t('reportLogs.saved'))}
      />
      <ReportDecisionDialog pending={decision} onClose={() => setDecision(null)} onDone={changed} />
      <ReportMailDialog
        pending={mail}
        onClose={() => setMail(null)}
        onSent={() => changed(t('reportLogs.mailSent'))}
      />
    </Stack>
  );
}
