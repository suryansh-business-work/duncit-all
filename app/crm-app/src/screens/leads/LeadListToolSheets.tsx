import type { CrmAiLeadEntity } from '@duncit/utils';

import type { LeadKind } from '@/features/leads/leadKinds';
import type { useLeadListState } from '@/features/leads-list/useLeadListState';
import { useTranslation } from '@/hooks/useTranslation';
import { LeadListAiSheet } from './LeadListAiSheet';
import { LeadListFiltersSheet } from './LeadListFiltersSheet';
import { LeadListImportSheet, importSummary } from './LeadListImportSheet';
import { LeadListNearbySheet } from './LeadListNearbySheet';
import { LeadListRecalculate } from './LeadListRecalculate';

export type ToolSheet = 'filters' | 'nearby' | 'ai' | 'import' | 'recalculate' | null;

/** Fill with AI and Excel import create venue and host leads (as on the portal). */
const bulkEntity = (kind: LeadKind): CrmAiLeadEntity | null =>
  kind === 'VENUE_LEAD' || kind === 'HOST_LEAD' ? kind : null;

interface Props {
  sheet: ToolSheet;
  kind: LeadKind;
  state: ReturnType<typeof useLeadListState>;
  onClose: () => void;
  /** A result to show at the top of the list, nothing reloaded. */
  onStatus: (message: string) => void;
  /** A result to show, then the list reloads (leads were added). */
  onDone: (message: string) => void;
}

/** The kind list's tool sheets: filters, Nearby leads, Recalculate scores, Fill with AI, Excel import. */
export function LeadListToolSheets({
  sheet,
  kind,
  state,
  onClose,
  onStatus,
  onDone,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const entity = bulkEntity(kind);
  return (
    <>
      {/* Mounted only while open, so its pickable values are read when the sheet is opened. */}
      {sheet === 'filters' ? (
        <LeadListFiltersSheet
          open
          kind={kind}
          nearby={state.nearbyOn}
          values={state.filterValues}
          onApply={(values) => {
            state.applyFilters(values);
            onClose();
          }}
          onClear={() => {
            state.clearFilters();
            onClose();
          }}
          onClose={onClose}
        />
      ) : null}
      <LeadListNearbySheet
        open={sheet === 'nearby'}
        search={state.nearbySearch}
        scan={state.scan}
        onSubmit={state.startNearby}
        onClose={onClose}
      />
      <LeadListRecalculate
        open={sheet === 'recalculate'}
        kind={kind}
        onClose={onClose}
        onDone={(message) => {
          onClose();
          onStatus(message);
        }}
      />
      {entity ? (
        <>
          <LeadListAiSheet
            open={sheet === 'ai'}
            entity={entity}
            onClose={onClose}
            onSaved={(count) =>
              onDone(
                entity === 'VENUE_LEAD'
                  ? t('crm.venueLeads.createdCount', { count })
                  : t('crm.hostLeads.createdCount', { count }),
              )
            }
          />
          <LeadListImportSheet
            open={sheet === 'import'}
            entity={entity}
            onClose={onClose}
            onImported={(result) => onDone(importSummary(result, t))}
          />
        </>
      ) : null}
    </>
  );
}
