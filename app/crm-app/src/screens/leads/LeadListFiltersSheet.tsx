import { fireAndForget, logs } from '@duncit/logs';

import { StateView } from '@/components/StateView';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useLeadEditorOptions } from '@/features/leads/editor/useLeadEditorOptions';
import { LEAD_LIST_KINDS } from '@/features/leads-list/listKinds';
import { LeadListFiltersForm, type LeadListFilterValues } from '@/forms/lead-list-filters';
import { useTranslation } from '@/hooks/useTranslation';
import { LeadListSheet } from './LeadListSheet';

interface Props {
  open: boolean;
  kind: LeadKind;
  nearby: boolean;
  values: LeadListFilterValues;
  onApply: (values: LeadListFilterValues) => void;
  onClear: () => void;
  onClose: () => void;
}

/**
 * Leads listing › Filters: the order and the column filters, with the same
 * pickable values the portal's table offers (statuses of this kind,
 * priorities, the CRM team, super categories).
 */
export function LeadListFiltersSheet({
  open,
  kind,
  nearby,
  values,
  onApply,
  onClear,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { options, error, refetch } = useLeadEditorOptions(kind, t('crmApp.common.loadFailed'));
  return (
    <LeadListSheet
      open={open}
      title={t('shell.table.filters')}
      onClose={onClose}
      testID="filters-sheet"
    >
      {options ? (
        <LeadListFiltersForm
          kind={LEAD_LIST_KINDS[kind]}
          nearby={nearby}
          options={options}
          values={values}
          onApply={onApply}
          onClear={onClear}
        />
      ) : (
        <StateView
          loading={!error}
          error={error}
          onRetry={() =>
            fireAndForget(refetch(), logs.mobileApp, 'crm-app/LeadListFiltersSheet', 'retry')
          }
        />
      )}
    </LeadListSheet>
  );
}
