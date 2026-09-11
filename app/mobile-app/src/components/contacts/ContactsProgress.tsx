import { Spinner, Text, XStack, YStack } from 'tamagui';
import { contactLoadStatus, progressPercent, type ContactPagesState } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

interface BarProps {
  /** The sentence the bar stands for; it is also what a screen reader hears. */
  label: string;
  percent: number;
  testID: string;
}

/** A slim bar under the sentence it stands for — the sync's, and a list's
 * while its later pages stream in. Twin of mWeb's `ContactsProgress` (rule 27). */
export function ContactsProgress({ label, percent, testID }: Readonly<BarProps>) {
  return (
    <YStack gap={6} testID={testID}>
      <Text fontSize={12.5} color="$muted">
        {label}
      </Text>
      <YStack
        role="progressbar"
        aria-label={label}
        height={6}
        borderRadius={999}
        overflow="hidden"
        backgroundColor="$primarySoft"
      >
        <YStack height={6} borderRadius={999} width={`${percent}%`} backgroundColor="$primary" />
      </YStack>
    </YStack>
  );
}

/**
 * Where a list that is already on screen has got to — which of the four
 * `contactLoadStatus` answers, drawn in Tamagui. Twin of mWeb's
 * `ContactsLoadProgress` (rule 27).
 */
export function ContactsLoadProgress({
  pages,
  onRetry,
}: Readonly<{ pages: ContactPagesState<unknown>; onRetry: () => void }>) {
  const { t } = useTranslation();
  const status = contactLoadStatus(pages);
  if (status === 'IDLE') return null;
  if (status === 'REFRESHING') {
    return <Spinner testID="contacts-list-refreshing" color="$primary" />;
  }
  if (status === 'FAILED') {
    return (
      <XStack testID="contacts-load-failed" alignItems="center" gap={8}>
        <Text flex={1} fontSize={12.5} color="$danger">
          {t('mweb.contacts.loadMoreFailed')}
        </Text>
        <DuncitButton
          testID="contacts-load-retry"
          label={t('mweb.contacts.loadRetry')}
          variant="outline"
          size="sm"
          onPress={onRetry}
        />
      </XStack>
    );
  }
  const loaded = pages.rows.length;
  return (
    <ContactsProgress
      testID="contacts-load-progress"
      label={t('mweb.contacts.loadProgress', { vars: { loaded, total: pages.total } })}
      percent={progressPercent(loaded, pages.total)}
    />
  );
}
