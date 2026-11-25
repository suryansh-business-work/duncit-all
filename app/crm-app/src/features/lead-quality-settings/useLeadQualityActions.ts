import { useState } from 'react';
import { leadQualityFailure, type LeadQualityIssueLike } from '@duncit/forms/schemas';

import type { LeadKind } from '@/features/leads/leadKinds';
import {
  CrmAppDeleteLeadQualityDraftDocument,
  CrmAppPublishLeadQualityConfigDocument,
  CrmAppSaveLeadQualityDraftDocument,
  CrmAppStartLeadQualityDraftDocument,
} from '@/graphql/leadQualitySettings';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { ApiError, errorMessage } from '@/utils/errors';
import type { QualitySubmission } from './editor';

/** A refusal shown above the form (issues go onto the form's fields instead). */
export interface ActionFailure {
  conflict: boolean;
  message: string;
}

/**
 * Save, publish, discard and start-from-version for one lead type, as the
 * portal runs them: `CONFLICT` asks for a reload, `BAD_USER_INPUT` issues go
 * back onto the form, anything else is shown as the server said it. Each
 * success reads the settings, versions and change log again (`refresh`).
 */
export function useLeadQualityActions(leadType: LeadKind, refresh: () => Promise<unknown>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [serverIssues, setServerIssues] = useState<LeadQualityIssueLike[]>([]);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clear = () => {
    setServerIssues([]);
    setFailure(null);
    setNotice(null);
  };
  const fail = (error: unknown) => {
    const read = leadQualityFailure(
      error instanceof ApiError ? error.extensions : undefined,
      errorMessage(error, t('crmApp.common.saveFailed')),
    );
    setServerIssues(read.issues);
    if (read.conflict)
      setFailure({ conflict: true, message: t('crm.leadQualitySettings.conflict') });
    else if (read.issues.length === 0) setFailure({ conflict: false, message: read.message });
  };

  /** One step: its success sentence once everything is read again, or the refusal. */
  const run = async (step: () => Promise<string>) => {
    clear();
    setBusy(true);
    try {
      const message = await step();
      await refresh();
      setNotice(message);
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const save = async (submission: QualitySubmission, revision: number | null) => {
    const { saveCrmLeadQualityDraft } = await gqlRequest(CrmAppSaveLeadQualityDraftDocument, {
      lead_type: leadType,
      input: submission.input,
      revision,
      change_note: submission.change_note,
    });
    return saveCrmLeadQualityDraft.revision;
  };

  const saveDraft = (submission: QualitySubmission, revision: number | null) =>
    run(async () => {
      await save(submission, revision);
      return t('crm.leadQualitySettings.draftSaved');
    });

  /** Publishes what is on screen: unsaved edits are saved first, so the published version is exactly what was reviewed. */
  const publish = (submission: QualitySubmission, draftRevision: number) =>
    run(async () => {
      const revision = submission.dirty ? await save(submission, draftRevision) : draftRevision;
      const { publishCrmLeadQualityConfig: result } = await gqlRequest(
        CrmAppPublishLeadQualityConfigDocument,
        {
          lead_type: leadType,
          revision,
          change_note: submission.change_note,
        },
      );
      const vars = { vars: { version: result.config.version } };
      return result.recalculation_job_id
        ? t('crmApp.leadQualitySettings.publishedRescoring', vars)
        : t('crm.leadQualitySettings.publishedNoLeads', vars);
    });

  const discard = () =>
    run(async () => {
      await gqlRequest(CrmAppDeleteLeadQualityDraftDocument, { lead_type: leadType });
      return t('crm.leadQualitySettings.discarded');
    });

  /** "Edit" (from the published version) and "Restore as draft" (from any version). */
  const startFrom = (version: number) =>
    run(async () => {
      const { startCrmLeadQualityDraftFromVersion: draft } = await gqlRequest(
        CrmAppStartLeadQualityDraftDocument,
        {
          lead_type: leadType,
          version,
        },
      );
      return t('crm.leadQualitySettings.draftStarted', { vars: { version, draft: draft.version } });
    });

  /** After a conflict: drop the refusal and read everything again. */
  const reload = async () => {
    clear();
    await refresh();
  };

  return {
    saveDraft,
    publish,
    discard,
    startFrom,
    reload,
    clear,
    busy,
    serverIssues,
    failure,
    notice,
  };
}
