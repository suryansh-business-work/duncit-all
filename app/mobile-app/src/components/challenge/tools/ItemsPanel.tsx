import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { challengeItems, doneItemKeys } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { ProgressBar, ToolCard, ToolNote, type PanelProps } from './ToolCard';

/**
 * A Checklist or Checkpoint tool — the Tamagui twin of mWeb's
 * ChallengeItemsPanel (rule 27): how far every competitor has got and, for a
 * competitor, their own list. Tasks are ticked by the host; a checkpoint is
 * reached by scanning the QR code posted at it.
 */
export function ItemsPanel({ challenge, tool }: Readonly<Pick<PanelProps, 'challenge' | 'tool'>>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const items = challengeItems(tool);
  const mine = challenge.viewer.my_competitor_id;
  const myDone = new Set(mine ? doneItemKeys(tool, mine) : []);

  return (
    <ToolCard icon="checklist" title={tool.label} testID={`challenge-items-${tool.instance_id}`}>
      {challenge.competitors.map((c) => {
        const done = doneItemKeys(tool, c.competitor_id).length;
        return (
          <YStack key={c.competitor_id} gap={6}>
            <Text fontSize={14} color="$color">
              {t('mweb.challenge.tools.itemsProgress', {
                vars: { name: c.name, done, total: items.length },
              })}
            </Text>
            <ProgressBar percent={items.length ? (done * 100) / items.length : 0} />
          </YStack>
        );
      })}
      {mine ? (
        <YStack role="list" aria-label={t('mweb.challenge.tools.itemsMine')} gap={8}>
          {items.map((item) => {
            const done = myDone.has(item.key);
            return (
              <XStack key={item.key} role="listitem" alignItems="center" gap={10}>
                <MaterialIcons
                  name={done ? 'check-circle' : 'radio-button-unchecked'}
                  size={20}
                  color={done ? colors.success : colors.muted}
                  accessibilityLabel={t(
                    done ? 'mweb.challenge.tools.itemDone' : 'mweb.challenge.tools.itemPending',
                  )}
                />
                <YStack flex={1}>
                  <Text fontSize={14} color="$color">
                    {item.label}
                  </Text>
                  <Text fontSize={12} color="$muted">
                    {t('mweb.challenge.score', { vars: { score: item.points } })}
                  </Text>
                </YStack>
              </XStack>
            );
          })}
        </YStack>
      ) : null}
      {mine && tool.input_kind === 'CHECKPOINT' ? (
        <ToolNote>{t('mweb.challenge.tools.checkpointHint')}</ToolNote>
      ) : null}
    </ToolCard>
  );
}
