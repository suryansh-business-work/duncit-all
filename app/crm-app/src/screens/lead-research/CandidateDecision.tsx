import { useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Input, Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { Toggle } from '@/components/Toggle';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import {
  CrmAppApproveCandidatesDocument,
  CrmAppRejectCandidatesDocument,
} from '@/graphql/leadResearch';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

const SCOPE = 'crm-app/CandidateDecision';
/** What the server keeps of a decision note. */
const NOTE_MAX = 300;

export type Outcome = ResultOf<
  typeof CrmAppApproveCandidatesDocument
>['approveCrmLeadCandidates'][number];

interface Props {
  candidateId: string;
  /** Re-read the candidate after a decision; `outcome` is what add-to-CRM reported. */
  onDecided: (outcome: Outcome | null) => void;
}

/**
 * Add to CRM (only a qualified non-duplicate, unless "allow unqualified" is
 * on) or Reject with an optional reason — the portal's two decision dialogs.
 */
export function CandidateDecision({ candidateId, onDecided }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<'approve' | 'reject' | null>(null);
  const [allowUnqualified, setAllowUnqualified] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (decide: () => Promise<Outcome | null>) => {
    setBusy(true);
    setError(null);
    try {
      const outcome = await decide();
      setOpen(null);
      onDecided(outcome);
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setBusy(false);
    }
  };
  const approve = () =>
    run(async () => {
      const { approveCrmLeadCandidates } = await gqlRequest(CrmAppApproveCandidatesDocument, {
        ids: [candidateId],
        allow_unqualified: allowUnqualified,
      });
      return approveCrmLeadCandidates[0] ?? null;
    });
  const reject = () =>
    run(async () => {
      await gqlRequest(CrmAppRejectCandidatesDocument, {
        ids: [candidateId],
        note: note.trim() || null,
      });
      return null;
    });
  const close = () => {
    setOpen(null);
    setError(null);
  };

  return (
    <>
      <XStack gap="$2">
        <YStack flex={1}>
          <DuncitButton
            label={t('crm.leadResearch.addToCrm')}
            onPress={() => setOpen('approve')}
            fullWidth
            testID="candidate-approve"
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            label={t('crm.leadResearch.reject')}
            onPress={() => setOpen('reject')}
            variant="outline"
            tone="danger"
            fullWidth
            testID="candidate-reject"
          />
        </YStack>
      </XStack>
      <ConfirmDialog
        open={open === 'approve'}
        title={t('crm.leadResearch.approveTitle', { count: 1, vars: { count: 1 } })}
        message={t('crm.leadResearch.approveBody')}
        confirmLabel={t('crm.leadResearch.addToCrm')}
        cancelLabel={t('shell.common.cancel')}
        busy={busy}
        error={error}
        onConfirm={() => fireAndForget(approve(), logs.mobileApp, SCOPE, 'approve')}
        onCancel={close}
        testID="approve-dialog"
      >
        <XStack alignItems="center" gap="$3">
          <Toggle
            checked={allowUnqualified}
            onChange={setAllowUnqualified}
            label={t('crm.leadResearch.allowUnqualified')}
            testID="allow-unqualified"
          />
          <YStack flex={1}>
            <Text fontWeight="600">{t('crm.leadResearch.allowUnqualified')}</Text>
            <Text color="$muted" fontSize="$2">
              {t('crm.leadResearch.allowUnqualifiedHint')}
            </Text>
          </YStack>
        </XStack>
      </ConfirmDialog>
      <ConfirmDialog
        open={open === 'reject'}
        title={t('crm.leadResearch.rejectTitle', { count: 1, vars: { count: 1 } })}
        message={t('crm.leadResearch.rejectBody')}
        confirmLabel={t('crm.leadResearch.reject')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={busy}
        error={error}
        onConfirm={() => fireAndForget(reject(), logs.mobileApp, SCOPE, 'reject')}
        onCancel={close}
        testID="reject-dialog"
      >
        <Input
          value={note}
          onChangeText={setNote}
          maxLength={NOTE_MAX}
          placeholder={t('crm.leadResearch.rejectNote')}
          aria-label={t('crm.leadResearch.rejectNote')}
          placeholderTextColor="$muted"
          borderColor="$inputBorder"
          testID="reject-note"
        />
        <Text color="$muted" fontSize="$2">
          {t('crm.leadResearch.rejectNoteHint', { vars: { max: NOTE_MAX } })}
        </Text>
      </ConfirmDialog>
    </>
  );
}
