import { useEffect, useState } from 'react';
import { Button, Input, Spinner, Text, XStack, YStack } from 'tamagui';

import { MediaUploadField } from '@/components/create-pod/MediaUploadField';
import { useReportProblemConfig } from '@/hooks/useReportProblemConfig';
import { useTranslation } from '@/hooks/useTranslation';

interface FeedbackValues {
  category: string;
  message: string;
  media_urls: string[];
}

interface Props {
  submitting?: boolean;
  errorMessage?: string;
  onSubmit: (values: FeedbackValues) => void;
}

/** A labelled field caption (mirrors TicketForm's FieldLabel). */
function FieldLabel({ children }: Readonly<{ children: string }>) {
  return (
    <Text fontSize={12.5} fontWeight="600" color="$muted">
      {children}
    </Text>
  );
}

/**
 * Report-a-problem / feedback form — category chips, the message, screenshots
 * and submit.
 *
 * The chips and the prompt come from the SERVER now, not a hardcoded list:
 * Support edits them in the portal, so adding a category no longer needs a
 * release. Screenshots matter more here than anywhere else in the app — a
 * picture of the broken screen is most of a bug report — so the picker is part
 * of the form rather than an afterthought.
 */
export function FeedbackForm({ submitting, errorMessage, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { config, loading } = useReportProblemConfig();
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [mediaText, setMediaText] = useState('');
  const [error, setError] = useState('');

  // Default to the first chip the server offers, once it has answered. Not a
  // constant: which chips exist is now configuration.
  useEffect(() => {
    const first = config.categories[0];
    if (!category && first) setCategory(first.label);
  }, [category, config.categories]);

  const mediaUrls = mediaText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const submit = () => {
    if (!category) {
      setError(t('mweb.support.pickACategory'));
      return;
    }
    if (message.trim().length < config.message_min_length) {
      setError(`Please describe it in at least ${config.message_min_length} characters.`);
      return;
    }
    setError('');
    onSubmit({ category, message: message.trim(), media_urls: mediaUrls });
  };

  return (
    <YStack
      testID="feedback-form"
      gap={12}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <YStack gap={6}>
        <FieldLabel>{t('mweb.common.category')}</FieldLabel>
        {loading && config.categories.length === 0 ? (
          <Spinner testID="feedback-cats-loading" size="small" color="$primary" />
        ) : (
          <XStack gap={8} flexWrap="wrap">
            {config.categories.map((option) => {
              const selected = option.label === category;
              return (
                <XStack
                  key={option.key || option.label}
                  testID={`feedback-cat-${option.label}`}
                  role="button"
                  aria-label={option.label}
                  aria-pressed={selected}
                  onPress={() => setCategory(option.label)}
                  paddingHorizontal={14}
                  paddingVertical={8}
                  borderRadius={999}
                  borderWidth={1}
                  borderColor={selected ? '$primary' : '$borderColor'}
                  backgroundColor={selected ? '$primary' : '$surface'}
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontWeight="600" fontSize={13} color={selected ? '$onPrimary' : '$color'}>
                    {option.label}
                  </Text>
                </XStack>
              );
            })}
          </XStack>
        )}
      </YStack>

      <YStack gap={4}>
        <FieldLabel>{config.message_label}</FieldLabel>
        <Input
          testID="feedback-message"
          aria-label={t('mweb.common.message')}
          placeholder={t('mweb.common.describeTheProblemOrShareYour')}
          placeholderTextColor="$muted"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          backgroundColor="$background"
        />
        <Text fontSize={11} color="$muted">
          {config.message_hint}
        </Text>
      </YStack>

      {config.allow_media ? (
        <MediaUploadField
          value={mediaText}
          onChange={setMediaText}
          label={t('mweb.common.screenshotsOptional')}
          folder="/feedback"
        />
      ) : null}

      {error || errorMessage ? (
        <Text testID="feedback-error" color="$danger" fontSize={12}>
          {error || errorMessage}
        </Text>
      ) : null}

      <Button
        testID="feedback-submit"
        onPress={submit}
        disabled={submitting}
        backgroundColor="$primary"
        color="$onPrimary"
        fontWeight="700"
      >
        {submitting ? 'Sending…' : 'Send feedback'}
      </Button>
    </YStack>
  );
}
