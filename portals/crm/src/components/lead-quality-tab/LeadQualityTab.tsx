import { useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { CrmLeadEntityType } from '../../api/crm.types';
import { useLeadQualityDetails } from './useLeadQuality';
import { useLeadQualityActions } from './useLeadQualityActions';
import { evidenceByKey, itemNamesOf, type QualityItemResult } from './qualityTypes';
import QualitySummary from './QualitySummary';
import QualityBreakdownTable from './QualityBreakdownTable';
import QualityHistory from './QualityHistory';
import EvidenceDialog from './EvidenceDialog';

interface Props {
  entity: CrmLeadEntityType;
  leadId: string;
}

/**
 * The Quality Score tab of every lead detail page: the summary, the
 * criterion-wise breakdown with each item's evidence, and the history.
 */
export default function LeadQualityTab({ entity, leadId }: Readonly<Props>) {
  const { t } = useTranslation();
  const { details, loading, error, refetch } = useLeadQualityDetails(entity, leadId);
  const actions = useLeadQualityActions(entity, leadId);
  const [editing, setEditing] = useState<QualityItemResult | null>(null);
  const evidence = useMemo(() => evidenceByKey(details?.evidence ?? []), [details]);
  const itemNames = useMemo(() => itemNamesOf(details?.result), [details]);

  if (loading && !details) return <Loader label={t('crm.leadQualityTab.loading')} />;
  if (!details) {
    return (
      <Alert
        severity="error"
        data-testid="lead-quality-error"
        action={
          <DuncitButton color="inherit" size="small" onClick={() => fireAndForget(refetch(), logs.portal.crm, 'LeadQualityTab', 'retry')}>
            {t('shell.common.retry')}
          </DuncitButton>
        }
      >
        {t('crm.leadQualityTab.loadFailed')} {error ? parseApiError(error) : ''}
      </Alert>
    );
  }

  return (
    <Stack spacing={2.5} data-testid="lead-quality-tab">
      <QualitySummary details={details} actions={actions} />
      {details.result && <QualityBreakdownTable result={details.result} evidence={evidence} onRecord={setEditing} />}
      <QualityHistory entity={entity} leadId={leadId} itemNames={itemNames} />
      {editing && (
        <EvidenceDialog
          key={editing.key}
          item={editing}
          evidence={evidence.get(editing.key)}
          actions={actions}
          onClose={() => setEditing(null)}
        />
      )}
    </Stack>
  );
}
