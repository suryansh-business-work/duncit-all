import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreatePodForm } from './create-pod.types';

/** Splits the stored hashtag text into clean tags (no #, no blanks). */
export const parseHashtags = (text: string): string[] =>
  Array.from(
    new Set(
      text
        .split(/[\s,]+/)
        .map((item) => item.replace(/^#/, '').trim())
        .filter(Boolean),
    ),
  );

const serializeHashtags = (tags: string[]): string => tags.map((tag) => `#${tag}`).join(' ');

interface Props {
  form: CreatePodForm;
}

/** Hashtags as removable chips — type a tag and submit (or end with a space/
 * comma) to add it. Serializes back into pod_hashtag_text, same as mWeb. */
export function HashtagChipsField({ form }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const [draft, setDraft] = useState('');

  return (
    <Controller
      control={form.control}
      name="pod_hashtag_text"
      render={({ field }) => {
        const tags = parseHashtags(field.value ?? '');
        const commit = (text: string) => {
          const next = parseHashtags(text);
          if (next.length === 0) return;
          field.onChange(serializeHashtags([...tags, ...next]));
          setDraft('');
        };
        const removeTag = (tag: string) => {
          field.onChange(serializeHashtags(tags.filter((item) => item !== tag)));
        };
        const onChangeText = (text: string) => {
          // A trailing space/comma commits the tag immediately, like mWeb.
          if (/[\s,]$/.test(text)) commit(text);
          else setDraft(text);
        };
        return (
          <YStack gap={8}>
            <Text fontSize={14} fontWeight="500" color="$color">
              Hashtags
            </Text>
            {tags.length > 0 ? (
              <XStack gap={6} flexWrap="wrap">
                {tags.map((tag) => (
                  <XStack
                    key={tag}
                    testID={`hashtag-chip-${tag}`}
                    alignItems="center"
                    gap={4}
                    borderRadius={999}
                    paddingHorizontal={10}
                    paddingVertical={5}
                    backgroundColor="$primary"
                  >
                    <Text fontSize={12} fontWeight="800" color="$onPrimary">
                      #{tag}
                    </Text>
                    <XStack
                      testID={`hashtag-remove-${tag}`}
                      role="button"
                      aria-label={`Remove ${tag}`}
                      onPress={() => removeTag(tag)}
                      pressStyle={{ opacity: 0.7 }}
                    >
                      <MaterialIcons name="close" size={13} color={onPrimary} />
                    </XStack>
                  </XStack>
                ))}
              </XStack>
            ) : null}
            <Input
              testID="field-pod_hashtag_text"
              size="$4"
              backgroundColor="$surface"
              color="$color"
              placeholderTextColor="$muted"
              borderColor="$borderColor"
              placeholder="Type a tag and press Enter"
              value={draft}
              onChangeText={onChangeText}
              onSubmitEditing={() => commit(draft)}
              onBlur={() => commit(draft)}
              autoCapitalize="none"
              aria-label="Hashtags"
            />
            <Text fontSize={12} color="$muted">
              Press Enter, space or comma to add a tag.
            </Text>
          </YStack>
        );
      }}
    />
  );
}
