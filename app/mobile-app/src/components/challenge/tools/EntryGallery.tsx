import { Linking } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import type { ChallengeEntry } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { ToolNote } from './ToolCard';

interface Props {
  entries: ChallengeEntry[];
  /** competitor_id → name. */
  names: ReadonlyMap<string, string>;
  /** Whether this viewer may remove the entry (the server decides again). */
  canRemove: (entry: ChallengeEntry) => boolean;
  onRemove: (entry: ChallengeEntry) => void;
  busy: boolean;
}

/**
 * A Submission tool's entries — the Tamagui twin of mWeb's ChallengeGallery
 * (rule 27). A photo shows inline; a video or audio piece opens in the
 * device's own player, which already has the controls and captions settings
 * the person chose.
 */
export function EntryGallery({ entries, names, canRemove, onRemove, busy }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!entries.length) return <ToolNote>{t('mweb.challenge.tools.noSubmissions')}</ToolNote>;
  return (
    <YStack gap={14}>
      {entries.map((entry) => {
        const name = names.get(entry.competitor_id) ?? '';
        return (
          <YStack key={entry.id} gap={6} testID={`challenge-entry-${entry.id}`}>
            {entry.media_type === 'IMAGE' ? (
              <AppImage
                accessibilityLabel={t('mweb.challenge.tools.entryBy', { vars: { name } })}
                source={{ uri: entry.media_url }}
                style={{ width: '100%', height: 220, borderRadius: 12 }}
                resizeMode="cover"
              />
            ) : (
              <DuncitButton
                variant="outline"
                label={t(
                  entry.media_type === 'VIDEO'
                    ? 'mweb.challenge.tools.playVideo'
                    : 'mweb.challenge.tools.playAudio',
                  { vars: { name } },
                )}
                onPress={() => fireAndForget(Linking.openURL(entry.media_url))}
                testID={`challenge-entry-open-${entry.id}`}
                fullWidth
              />
            )}
            <XStack alignItems="center" gap={8}>
              <YStack flex={1}>
                <Text fontSize={14} fontWeight="700" color="$color">
                  {name}
                </Text>
                {entry.caption ? (
                  <Text fontSize={14} color="$muted">
                    {entry.caption}
                  </Text>
                ) : null}
              </YStack>
              {canRemove(entry) ? (
                <DuncitButton
                  size="sm"
                  variant="ghost"
                  tone="danger"
                  disabled={busy}
                  label={t('mweb.challenge.removeRow')}
                  aria-label={t('mweb.challenge.tools.removeEntry', { vars: { name } })}
                  onPress={() => onRemove(entry)}
                  testID={`challenge-entry-remove-${entry.id}`}
                />
              ) : null}
            </XStack>
          </YStack>
        );
      })}
    </YStack>
  );
}
