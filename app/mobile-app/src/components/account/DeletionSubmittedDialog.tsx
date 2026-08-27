import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface DeletionSubmittedDialogProps {
  open: boolean;
  code: string;
  /** The date the account is scheduled to go, as the server stamped it. */
  deletesOn: string;
  onSignOut: () => void;
}

/**
 * What happens the moment a deletion request is filed: the member is told the
 * date, and then signed out. RN twin of mWeb's dialog (rule 27).
 *
 * Signing out is the point. A request to be deleted that leaves the person
 * sitting in a fully working session reads as "nothing happened" — and the one
 * thing this flow has to get across is that something now WILL happen, on a
 * date, unless they come back and stop it. That is also why there is no cancel
 * here: the withdrawal lives behind the next sign-in, where they are asked
 * about it directly.
 */
export function DeletionSubmittedDialog({
  open,
  code,
  deletesOn,
  onSignOut,
}: Readonly<DeletionSubmittedDialogProps>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  const footer = (
    <XStack
      testID="deletion-sign-out"
      role="button"
      aria-label={t('mweb.account.deletion.signOutNow')}
      onPress={onSignOut}
      height={46}
      alignItems="center"
      justifyContent="center"
      borderRadius={12}
      backgroundColor="$primary"
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={14} fontWeight="700" color="$onPrimary">
        {t('mweb.account.deletion.signOutNow')}
      </Text>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={onSignOut}
      testID="deletion-submitted"
      title={t('mweb.account.deletion.submittedTitle')}
      closeLabel={t('mweb.common.close')}
      dismissOnBackdrop={false}
      showCloseButton={false}
      footer={footer}
    >
      <YStack gap={10}>
        <Text fontSize={13.5} fontWeight="700" color="$danger">
          {t('mweb.account.deletion.submittedOn', { vars: { date: formatDate(deletesOn) } })}
        </Text>
        <Text fontSize={12.5} color="$muted">
          {t('mweb.account.deletion.submittedSealed')}
        </Text>
        <Text fontSize={12} color="$muted">
          {t('mweb.account.deletion.pendingRef', { vars: { code } })}
        </Text>
      </YStack>
    </DuncitDialog>
  );
}
