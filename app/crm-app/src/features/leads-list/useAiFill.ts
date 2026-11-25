import { useState } from 'react';
import {
  crmAiParseRecords,
  crmAiRecordToRow,
  crmAiRowError,
  crmAiRowToInput,
  type CrmAiLeadEntity,
  type CrmAiRow,
} from '@duncit/utils';

import { CrmAppAiParseLeadsDocument } from '@/graphql/leadLists';
import { CrmAppCreateHostLeadDocument, CrmAppCreateVenueLeadDocument } from '@/graphql/leadEditor';
import type { Translate } from '@/i18n/fallback';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

/** Create one lead from an AI row with the portal's own create mutation. */
async function createLead(entity: CrmAiLeadEntity, row: CrmAiRow) {
  // The input is built field by field from the AI record (crmAiRowToInput); the server
  // validates it against VenueLeadInput / HostLeadInput exactly as for the portal.
  const input = crmAiRowToInput(row, entity) as never;
  if (entity === 'VENUE_LEAD') await gqlRequest(CrmAppCreateVenueLeadDocument, { input });
  else await gqlRequest(CrmAppCreateHostLeadDocument, { input });
}

/**
 * Fill with AI (the portal's FillWithAiDialog): paste text → the AI reads one
 * or more leads → review and edit each → create them. Rows that could not be
 * created stay, with the reason on each.
 */
export function useAiFill(entity: CrmAiLeadEntity, t: Translate) {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<CrmAiRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'parsing' | 'saving' | null>(null);

  const parse = async () => {
    setError(null);
    if (!text.trim()) {
      setError(t('crm.components.pasteSomeTextToParseFirst'));
      return;
    }
    setBusy('parsing');
    try {
      const { aiParseCrmLeads } = await gqlRequest(CrmAppAiParseLeadsDocument, { entity, text });
      const records = crmAiParseRecords(aiParseCrmLeads);
      if (records.length === 0) throw new Error(t('crm.aiFill.noneFound'));
      setRows(records.map((record, index) => crmAiRecordToRow(record, entity, index)));
      setStep('review');
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.loadFailed')));
    } finally {
      setBusy(null);
    }
  };

  /** Creates every valid row, one after another; resolves to how many were created and how many are left. */
  const save = async (): Promise<{ created: number; left: number }> => {
    setError(null);
    setBusy('saving');
    let created = 0;
    const left: CrmAiRow[] = [];
    for (const row of rows) {
      const issue = crmAiRowError(row, entity, t);
      if (issue) {
        left.push({ ...row, _error: issue });
        continue;
      }
      try {
        await createLead(entity, row);
        created += 1;
      } catch (err) {
        left.push({ ...row, _error: errorMessage(err, t('crmApp.common.saveFailed')) });
      }
    }
    setRows(left);
    setBusy(null);
    if (left.length > 0)
      setError(t('crmApp.leadList.aiPartial', { vars: { created, failed: left.length } }));
    return { created, left: left.length };
  };

  const reset = () => {
    setStep('input');
    setText('');
    setRows([]);
    setError(null);
  };

  return {
    step,
    text,
    setText,
    rows,
    error,
    busy,
    parse,
    save,
    back: () => setStep('input'),
    reset,
    updateRow: (id: number, patch: Partial<CrmAiRow>) =>
      setRows((current) => current.map((row) => (row._id === id ? { ...row, ...patch } : row))),
  };
}
