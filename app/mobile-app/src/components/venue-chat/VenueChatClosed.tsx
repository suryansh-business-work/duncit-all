import { EmptyState } from '@/components/EmptyState';
import { useTranslation } from '@/hooks/useTranslation';

/** A venue thread that cannot open: not this user's (go back) or failed to load (retry). */
export function VenueChatClosed({
  unavailable,
  onBack,
  onRetry,
}: Readonly<{ unavailable: boolean; onBack: () => void; onRetry: () => void }>) {
  const { t } = useTranslation();
  if (unavailable) {
    return (
      <EmptyState
        testID="venue-chat-unavailable"
        icon="chat-bubble-outline"
        title={t('mweb.venueChat.unavailable')}
        actionLabel={t('mweb.common.goBack')}
        onAction={onBack}
      />
    );
  }
  return (
    <EmptyState
      testID="venue-chat-failed"
      icon="error-outline"
      title={t('mweb.venueChat.loadFailed')}
      actionLabel={t('mweb.venueChat.retry')}
      onAction={onRetry}
    />
  );
}
