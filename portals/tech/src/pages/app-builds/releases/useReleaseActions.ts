import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { useConfirm, notifySuccess, notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import type { LogRejectionValues } from './log-rejection';
import {
  LOG_STORE_REJECTION,
  RESOLVE_STORE_ISSUE,
  SET_STORE_ISSUE_REVIEWER_MESSAGE,
  SUBMIT_LATEST_BUILD_TO_STORE,
  type ReleaseStore,
  type StoreReleaseIssue,
} from './queries';

const STORE_KEY: Record<ReleaseStore, string> = {
  APP_STORE: 'tech.appBuilds.releaseStoreAppStore',
  GOOGLE_PLAY: 'tech.appBuilds.releaseStoreGooglePlay',
};

export interface ReleaseActions {
  submitLatest: () => Promise<void>;
  resolve: (issue: StoreReleaseIssue) => Promise<void>;
  saveReviewerMessage: (issue: StoreReleaseIssue, message: string) => Promise<void>;
  logRejection: (values: LogRejectionValues) => Promise<boolean>;
  busy: { submitting: boolean; resolving: boolean; savingMessage: boolean; logging: boolean };
}

/**
 * Everything the Releases page can do to a store, each confirmed where it
 * cannot be taken back and each followed by a fresh read of the store.
 */
export function useReleaseActions(store: ReleaseStore, refetch: () => Promise<unknown>): ReleaseActions {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const storeLabel = t(STORE_KEY[store]);
  const [submitMutation, submitting] = useMutation<any>(SUBMIT_LATEST_BUILD_TO_STORE);
  const [resolveMutation, resolving] = useMutation<any>(RESOLVE_STORE_ISSUE);
  const [messageMutation, savingMessage] = useMutation<any>(SET_STORE_ISSUE_REVIEWER_MESSAGE);
  const [logMutation, logging] = useMutation<any>(LOG_STORE_REJECTION);

  // A review push reaches every user once approved, so the confirm is styled
  // as destructive and names the store before anything is sent.
  const submitLatest = useCallback(async () => {
    const ok = await confirm({
      title: t('tech.appBuilds.submitLatestTitle', { vars: { store: storeLabel } }),
      message: t('tech.appBuilds.submitLatestMessage', { vars: { store: storeLabel } }),
      confirmLabel: t('tech.appBuilds.submitLatestAction'),
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await submitMutation({ variables: { store } });
      const build = res.data?.submitLatestBuildToStore;
      notifySuccess(t('tech.appBuilds.submitLatestStarted', { vars: { build: build?.build_no ?? '', version: build?.version ?? '' } }));
      await refetch();
    } catch (err) {
      notifyError(parseApiError(err));
    }
  }, [confirm, refetch, store, storeLabel, submitMutation, t]);

  const resolve = useCallback(
    async (issue: StoreReleaseIssue) => {
      const ok = await confirm({
        title: t('tech.appBuilds.resolveIssueTitle'),
        message: t('tech.appBuilds.resolveIssueMessage', { vars: { version: issue.version } }),
        confirmLabel: t('tech.appBuilds.resolveIssueAction'),
      });
      if (!ok) return;
      try {
        await resolveMutation({ variables: { id: issue.id } });
        notifySuccess(t('tech.appBuilds.resolveIssueDone'));
        await refetch();
      } catch (err) {
        notifyError(parseApiError(err));
      }
    },
    [confirm, refetch, resolveMutation, t]
  );

  const saveReviewerMessage = useCallback(
    async (issue: StoreReleaseIssue, message: string) => {
      try {
        await messageMutation({ variables: { id: issue.id, message } });
        notifySuccess(t('tech.appBuilds.reviewerMessageSaved'));
        await refetch();
      } catch (err) {
        notifyError(parseApiError(err));
      }
    },
    [messageMutation, refetch, t]
  );

  const logRejection = useCallback(
    async (values: LogRejectionValues) => {
      try {
        await logMutation({ variables: { input: { store, ...values } } });
        notifySuccess(t('tech.appBuilds.logRejectionDone'));
        await refetch();
        return true;
      } catch (err) {
        notifyError(parseApiError(err));
        return false;
      }
    },
    [logMutation, refetch, store, t]
  );

  return {
    submitLatest,
    resolve,
    saveReviewerMessage,
    logRejection,
    busy: {
      submitting: submitting.loading,
      resolving: resolving.loading,
      savingMessage: savingMessage.loading,
      logging: logging.loading,
    },
  };
}
