import { Text, XStack } from 'tamagui';
import { progressPercent, type ContactSyncStage } from '@duncit/utils';

import { IconDisc } from '@/components/account/IconDisc';
import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ContactsProgress } from '@/components/contacts/ContactsProgress';
import type { ContactsSyncStatus } from '@/hooks/useContacts';
import type { ContactsSyncFailure } from '@/hooks/useContactsSync';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';

interface Props {
  status: ContactsSyncStatus | null;
  busy: boolean;
  /** Where a sync in flight has got to; null while none is. */
  stage: ContactSyncStage | null;
  failure: ContactsSyncFailure | null;
  onAllow: () => void;
}

/**
 * The "allow" card: what syncing does, the button that does it, how far a
 * sync in flight has got, and what the last one found. Twin of mWeb's
 * `ContactsAllowCard` (rule 27).
 */
export function ContactsAllowCard({ status, busy, stage, failure, onAllow }: Readonly<Props>) {
  const { t } = useTranslation();
  let failureText = '';
  if (failure === 'DENIED') failureText = t('mweb.contacts.permissionDenied');
  else if (failure === 'FAILED') failureText = t('mweb.contacts.syncFailed');
  let summary = t('mweb.contacts.notSyncedYet');
  if (status) {
    summary = `${t('mweb.contacts.matched', { count: status.matched })} · ${t(
      'mweb.contacts.lastSynced',
      {
        vars: { when: formatDateTime(status.synced_at) },
      },
    )}`;
  }
  let stageLabel = '';
  if (stage?.phase === 'READING') stageLabel = t('mweb.contacts.syncing');
  else if (stage) {
    stageLabel = t('mweb.contacts.syncProgress', {
      vars: { sent: stage.done, total: stage.total },
    });
  }

  return (
    <SurfaceCard testID="contacts-allow-card" marginHorizontal={16} gap={12}>
      <XStack alignItems="center" gap={12}>
        <IconDisc icon="contact-phone" />
        <Text flex={1} fontSize={16} fontWeight="600" color="$color">
          {t('mweb.contacts.allowTitle')}
        </Text>
      </XStack>
      <Text fontSize={14} color="$muted">
        {t('mweb.contacts.allowBody')}
      </Text>
      <Text testID="contacts-sync-summary" fontSize={14} fontWeight="500" color="$color">
        {summary}
      </Text>
      {status && status.invitable > 0 ? (
        <Text testID="contacts-invite-summary" fontSize={14} color="$muted">
          {t('mweb.contacts.toInvite', { count: status.invitable })}
        </Text>
      ) : null}
      {stage ? (
        <ContactsProgress
          testID="contacts-sync-progress"
          label={stageLabel}
          percent={progressPercent(stage.done, stage.total)}
        />
      ) : null}
      <DuncitButton
        testID="contacts-allow-button"
        label={status ? t('mweb.contacts.resync') : t('mweb.contacts.allowButton')}
        size="lg"
        fullWidth
        onPress={onAllow}
        loading={busy}
      />
      {failureText ? (
        <Text testID="contacts-sync-error" fontSize={13} color="$danger">
          {failureText}
        </Text>
      ) : null}
    </SurfaceCard>
  );
}
