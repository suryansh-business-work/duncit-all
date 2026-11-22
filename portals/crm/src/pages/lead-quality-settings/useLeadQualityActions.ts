import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type {
  CrmLeadQualityPublishResult,
  MutationDeleteCrmLeadQualityDraftArgs,
  MutationPublishCrmLeadQualityConfigArgs,
  MutationSaveCrmLeadQualityDraftArgs,
  MutationStartCrmLeadQualityDraftFromVersionArgs,
} from '@duncit/gql-types';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import {
  DELETE_LEAD_QUALITY_DRAFT,
  PUBLISH_LEAD_QUALITY_CONFIG,
  SAVE_LEAD_QUALITY_DRAFT,
  START_LEAD_QUALITY_DRAFT_FROM_VERSION,
  type LeadQualityConfig,
  type LeadQualityIssue,
} from '../../api/leadQuality.gql';
import type { CrmLeadEntityType } from '../../api/crm.types';
import type { LeadQualitySubmission } from '../../forms/lead-quality-config';
import { readFailure } from './readFailure';

/** Every settings read on the page: the draft/published pair, the versions and the change log. */
const REFETCH = { refetchQueries: ['CrmLeadQualitySettings', 'CrmLeadQualityVersions', 'CrmLeadQualitySettingsHistory'], awaitRefetchQueries: true };

/** A refusal the page shows above the form (issues go onto the form's fields instead). */
export interface ActionFailure {
  conflict: boolean;
  message: string;
}

/**
 * Save, publish, discard and start-from-version for one lead type, with the
 * refusals read once: `CONFLICT` asks for a reload, `BAD_USER_INPUT` issues go
 * back onto the form, anything else is shown as the server said it.
 */
export function useLeadQualityActions(leadType: CrmLeadEntityType) {
  const { t } = useTranslation();
  const [saveMutation, saveState] = useMutation<{ saveCrmLeadQualityDraft: LeadQualityConfig }, MutationSaveCrmLeadQualityDraftArgs>(SAVE_LEAD_QUALITY_DRAFT, REFETCH);
  const [publishMutation, publishState] = useMutation<{ publishCrmLeadQualityConfig: CrmLeadQualityPublishResult }, MutationPublishCrmLeadQualityConfigArgs>(
    PUBLISH_LEAD_QUALITY_CONFIG,
    REFETCH,
  );
  const [discardMutation, discardState] = useMutation<{ deleteCrmLeadQualityDraft: boolean }, MutationDeleteCrmLeadQualityDraftArgs>(DELETE_LEAD_QUALITY_DRAFT, REFETCH);
  const [startMutation, startState] = useMutation<{ startCrmLeadQualityDraftFromVersion: LeadQualityConfig }, MutationStartCrmLeadQualityDraftFromVersionArgs>(
    START_LEAD_QUALITY_DRAFT_FROM_VERSION,
    REFETCH,
  );
  const [serverIssues, setServerIssues] = useState<LeadQualityIssue[]>([]);
  const [failure, setFailure] = useState<ActionFailure | null>(null);

  const begin = () => {
    setServerIssues([]);
    setFailure(null);
  };
  const fail = (error: unknown) => {
    const read = readFailure(error);
    setServerIssues(read.issues);
    if (read.conflict) setFailure({ conflict: true, message: t('crm.leadQualitySettings.conflict') });
    else if (read.issues.length === 0) setFailure({ conflict: false, message: read.message });
  };

  /**
   * Saves the draft; the saved version, or null when it was refused. Before a
   * publish it skips the refetch: the publish refetches everything anyway, and
   * the revision to publish must be the one this save returned, not a cache read.
   */
  const saveOnly = async (submission: LeadQualitySubmission, revision: number | null, refetch = true): Promise<LeadQualityConfig | null> => {
    try {
      const { data } = await saveMutation({
        variables: { lead_type: leadType, input: submission.input, revision, change_note: submission.change_note },
        ...(refetch ? {} : { refetchQueries: [], awaitRefetchQueries: false }),
      });
      return data?.saveCrmLeadQualityDraft ?? null;
    } catch (error) {
      fail(error);
      return null;
    }
  };

  const saveDraft = async (submission: LeadQualitySubmission, revision: number | null) => {
    begin();
    if (await saveOnly(submission, revision)) notifySuccess(t('crm.leadQualitySettings.draftSaved'));
  };

  /** Publishes what is on screen: unsaved edits are saved first, so the published version is exactly what was reviewed. */
  const publish = async (submission: LeadQualitySubmission, draft: LeadQualityConfig) => {
    begin();
    let revision = draft.revision;
    if (submission.dirty) {
      const saved = await saveOnly(submission, draft.revision, false);
      if (!saved) return;
      revision = saved.revision;
    }
    try {
      const { data } = await publishMutation({ variables: { lead_type: leadType, revision, change_note: submission.change_note } });
      const result = data?.publishCrmLeadQualityConfig;
      if (!result) return;
      const vars = { vars: { version: result.config.version } };
      notifySuccess(
        result.recalculation_job_id ? t('crm.leadQualitySettings.publishedRescoring', vars) : t('crm.leadQualitySettings.publishedNoLeads', vars),
      );
    } catch (error) {
      fail(error);
    }
  };

  const discard = async () => {
    begin();
    try {
      await discardMutation({ variables: { lead_type: leadType } });
      notifySuccess(t('crm.leadQualitySettings.discarded'));
    } catch (error) {
      fail(error);
    }
  };

  /** "Edit" (from the published version) and "Restore as draft" (from any version). */
  const startFrom = async (version: number) => {
    begin();
    try {
      const { data } = await startMutation({ variables: { lead_type: leadType, version } });
      const draft = data?.startCrmLeadQualityDraftFromVersion;
      if (draft) notifySuccess(t('crm.leadQualitySettings.draftStarted', { vars: { version, draft: draft.version } }));
    } catch (error) {
      fail(error);
    }
  };

  return {
    saveDraft,
    publish,
    discard,
    startFrom,
    busy: saveState.loading || publishState.loading || discardState.loading || startState.loading,
    serverIssues,
    failure,
    clearFailure: begin,
  };
}
