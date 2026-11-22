import { Text, XStack, YStack } from 'tamagui';
import { actionStatusKey, canDecide, type AskDuncitActionView } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  action: AskDuncitActionView;
  canRollback: boolean;
  onDecide: (actionId: string, approve: boolean) => void;
  onRollback: (actionId: string) => void;
}

const STATUS_TONE: Record<string, string> = {
  PENDING: '$warning',
  EXECUTED: '$success',
  FAILED: '$danger',
};

/**
 * A change the assistant proposed — the twin of mWeb's ActionCard. Nothing
 * runs until Approve; the server re-checks permission when it does.
 */
export function AskActionCard({ action, canRollback, onDecide, onRollback }: Readonly<Props>) {
  const { t } = useTranslation();
  const pending = canDecide(action);
  const destructive = action.risk === 'DESTRUCTIVE';
  return (
    <YStack
      testID="ask-duncit-action"
      role="group"
      aria-label={t('askDuncit.action.ariaLabel')}
      borderWidth={1}
      borderColor={destructive ? '$danger' : '$borderColor'}
      borderRadius={12}
      padding={12}
      gap={8}
      backgroundColor="$background"
    >
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text flex={1} fontSize={14} fontWeight="700" color="$color">
          {action.tool_title}
        </Text>
        <Text fontSize={12} fontWeight="600" color={STATUS_TONE[action.status] ?? '$muted'}>
          {t(actionStatusKey(action.status))}
        </Text>
      </XStack>
      <Text fontSize={12} color="$muted">
        {destructive ? t('askDuncit.action.destructiveHint') : t('askDuncit.action.hint')}
      </Text>
      <Text
        fontSize={12}
        color="$color"
        backgroundColor="$soft"
        padding={8}
        borderRadius={8}
        numberOfLines={8}
      >
        {action.args_preview}
      </Text>
      {action.error_message ? (
        <Text fontSize={12} color="$danger" role="alert">
          {action.error_message}
        </Text>
      ) : null}
      {pending && (
        <XStack gap={8}>
          <DuncitButton
            testID="ask-duncit-approve"
            size="sm"
            tone={destructive ? 'danger' : 'primary'}
            label={t('askDuncit.action.approve')}
            onPress={() => onDecide(action.id, true)}
          />
          <DuncitButton
            testID="ask-duncit-reject"
            size="sm"
            variant="outline"
            tone="neutral"
            label={t('askDuncit.action.reject')}
            onPress={() => onDecide(action.id, false)}
          />
        </XStack>
      )}
      {canRollback && action.can_rollback && (
        <DuncitButton
          testID="ask-duncit-undo"
          size="sm"
          variant="ghost"
          tone="neutral"
          label={t('askDuncit.action.undo')}
          onPress={() => onRollback(action.id)}
        />
      )}
    </YStack>
  );
}
