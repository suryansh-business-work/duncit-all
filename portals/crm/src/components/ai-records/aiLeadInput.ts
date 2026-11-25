import { fallbackT, type useTranslation } from '@duncit/shell';
import { crmAiRecordToRow, crmAiRowError, crmAiRowToInput } from '@duncit/utils';
import type { AiRow } from './AiRecordsTable';

/**
 * Fill with AI's rules — an AI record → an editable row → the create input —
 * live in @duncit/utils (crm-lead-lists), shared with the Duncit CRM app.
 */
type Entity = 'VENUE_LEAD' | 'HOST_LEAD';
type Translate = ReturnType<typeof useTranslation>['t'];

/** Parsed AI record → editable grid row (core fields surfaced for editing). */
export const recordToRow = (rec: Record<string, unknown>, entity: Entity, index: number): AiRow =>
  crmAiRecordToRow(rec, entity, index);

/** Build a GraphQL VenueLeadInput / HostLeadInput from an edited AI row. */
export const rowToInput = (row: AiRow, entity: Entity): Record<string, any> => crmAiRowToInput(row, entity);

/** Validate required fields client-side; return a message or null. */
export const rowError = (row: AiRow, entity: Entity, t: Translate = fallbackT): string | null =>
  crmAiRowError(row, entity, t);
