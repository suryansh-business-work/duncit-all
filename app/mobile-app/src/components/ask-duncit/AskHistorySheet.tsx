import { useState } from 'react';
import { TextInput } from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { roleLabelKey } from '@duncit/utils';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';
import { fireAndForget } from '@/utils/fire-and-forget';
import { AskIconButton } from './AskIconButton';
import { useAskHistory, type AskConversationItem } from './useAskHistory';

interface Props {
  open: boolean;
  activeId: string | null;
  showMemory: boolean;
  onClose: () => void;
  onOpenConversation: (id: string) => void;
  onDeletedActive: () => void;
}

/** Chat history and memory — the Tamagui twin of mWeb's HistoryDrawer. */
export function AskHistorySheet({
  open,
  activeId,
  showMemory,
  onClose,
  onOpenConversation,
  onDeletedActive,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted, color: ink } = useThemeColors();
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<AskConversationItem | null>(null);
  const [error, setError] = useState(false);
  const history = useAskHistory(open, showMemory, search);

  const confirmDelete = async () => {
    const target = deleting;
    setDeleting(null);
    if (!target) return;
    try {
      await history.remove(target.id);
      if (target.id === activeId) onDeletedActive();
    } catch {
      setError(true);
    }
  };

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="ask-duncit-history"
      title={t('askDuncit.history.title')}
      closeLabel={t('askDuncit.close')}
      variant="sheet"
    >
      <YStack gap={10}>
        <YStack
          borderWidth={1}
          borderColor="$inputBorder"
          borderRadius={12}
          paddingHorizontal={12}
          paddingVertical={8}
        >
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('askDuncit.history.search')}
            placeholderTextColor={muted}
            accessibilityLabel={t('askDuncit.history.search')}
            style={{ color: ink, fontSize: 15 }}
          />
        </YStack>
        {history.loading && !history.items.length && <Spinner size="small" />}
        {(error || history.failed) && (
          <Text fontSize={13} color="$danger" role="alert">
            {t('askDuncit.errors.INTERNAL')}
          </Text>
        )}
        {!history.loading && !history.items.length && (
          <Text fontSize={13} color="$muted">
            {t('askDuncit.history.empty')}
          </Text>
        )}
        {history.items.map((item) => (
          <XStack
            key={item.id}
            alignItems="center"
            gap={8}
            padding={8}
            borderRadius={10}
            backgroundColor={item.id === activeId ? '$soft' : 'transparent'}
            role="button"
            tabIndex={0}
            onPress={() => onOpenConversation(item.id)}
          >
            <YStack flex={1} minWidth={0}>
              <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
                {item.title || t('askDuncit.history.untitled')}
              </Text>
              <Text fontSize={12} color="$muted" numberOfLines={1}>
                {`${t(roleLabelKey(item.role_key))}${item.last_message_at ? ` · ${formatDateTime(item.last_message_at)}` : ''}`}
              </Text>
            </YStack>
            <AskIconButton
              icon="delete-outline"
              size={18}
              label={t('askDuncit.history.delete')}
              onPress={() => setDeleting(item)}
            />
          </XStack>
        ))}
        {history.hasMore && (
          <DuncitButton
            size="sm"
            variant="ghost"
            tone="neutral"
            label={t('askDuncit.history.more')}
            onPress={history.loadMore}
          />
        )}
        {showMemory && (
          <YStack gap={6} borderTopWidth={1} borderColor="$borderColor" paddingTop={10}>
            <Text fontSize={14} fontWeight="700" color="$color">
              {t('askDuncit.memory.title')}
            </Text>
            {!history.facts.length && (
              <Text fontSize={12} color="$muted">
                {t('askDuncit.memory.empty')}
              </Text>
            )}
            {history.facts.map((fact) => (
              <XStack key={fact.id} alignItems="center" gap={8}>
                <Text flex={1} fontSize={14} color="$color">
                  {fact.text}
                </Text>
                <AskIconButton
                  icon="delete-outline"
                  size={18}
                  label={t('askDuncit.memory.forget')}
                  onPress={() => fireAndForget(history.forget(fact.id))}
                />
              </XStack>
            ))}
          </YStack>
        )}
      </YStack>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('askDuncit.history.deleteTitle')}
        message={deleting?.title}
        confirmLabel={t('askDuncit.history.delete')}
        destructive
        onConfirm={() => fireAndForget(confirmDelete())}
        onCancel={() => setDeleting(null)}
      />
    </DuncitDialog>
  );
}
