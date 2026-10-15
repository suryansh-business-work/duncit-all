import { useMemo } from 'react';
import { Linking } from 'react-native';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import {
  makeYoutubeLinkSchema,
  venueVideoOf,
  youtubeLinkDefaults,
  type YoutubeLinkValues,
} from '@duncit/forms/schemas';

import { DuncitButton } from '@/components/DuncitButton';
import { FieldLabel } from '@/components/Field';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  videos: string[];
  onChange: (videos: string[]) => void;
  limit: number;
  testID: string;
  error?: string;
}

/**
 * A dish's videos on the app: each one listed (a YouTube link, or a clip
 * uploaded from the web console) with a remove, and a YouTube link to add —
 * checked by the shared `makeYoutubeLinkSchema` (@duncit/regex YOUTUBE_URL).
 * Tamagui twin of @duncit/venue-food's VideoLinksField.
 */
export function FoodDishVideos({ videos, onChange, limit, testID, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeYoutubeLinkSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<YoutubeLinkValues>({
    resolver: formResolver<YoutubeLinkValues>(schema),
    defaultValues: youtubeLinkDefaults,
  });
  const atLimit = videos.length >= limit;

  const add = handleSubmit((values) => {
    onChange(Array.from(new Set([...videos, values.url.trim()])));
    reset(youtubeLinkDefaults);
  });

  return (
    <YStack gap={8} testID={testID}>
      <FieldLabel
        label={t('venueFoodOwner.videos.title', { vars: { used: videos.length, max: limit } })}
        testID={`${testID}-label`}
      />
      {videos.map((url, index) => {
        const youtube = venueVideoOf(url)?.kind === 'YOUTUBE';
        const label = youtube
          ? t('venueFoodOwner.videos.youtubeItem', { vars: { n: index + 1 } })
          : t('venueFoodOwner.videos.fileItem', { vars: { n: index + 1 } });
        return (
          <XStack key={url} alignItems="center" justifyContent="space-between" gap={8}>
            <Text
              flex={1}
              role="link"
              fontSize={13}
              color="$primary"
              numberOfLines={1}
              onPress={() => fireAndForget(Linking.openURL(url))}
            >
              {label}
            </Text>
            <DuncitButton
              testID={`${testID}-remove-${index}`}
              label={t('venueFoodOwner.common.delete')}
              accessibilityLabel={t('venueFoodOwner.videos.remove', { vars: { n: index + 1 } })}
              variant="ghost"
              tone="danger"
              size="sm"
              onPress={() => onChange(videos.filter((_url, itemIndex) => itemIndex !== index))}
            />
          </XStack>
        );
      })}
      {atLimit ? null : (
        <>
          <FormTextField
            control={control}
            name="url"
            label={t('venueFoodOwner.videos.youtube')}
            hint={t('venueFoodOwner.videos.youtubeHint')}
            keyboardType="url"
            autoCapitalize="none"
          />
          <DuncitButton
            testID={`${testID}-youtube-add`}
            label={t('venueFoodOwner.videos.add')}
            variant="outline"
            size="sm"
            onPress={() => fireAndForget(add())}
          />
        </>
      )}
      {error ? (
        <Text role="alert" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
