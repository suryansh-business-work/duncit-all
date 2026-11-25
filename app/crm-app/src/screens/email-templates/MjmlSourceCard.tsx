import { MaterialIcons } from '@expo/vector-icons';
import { useController, type Control } from 'react-hook-form';
import { Text, TextArea, XStack, YStack, useTheme } from 'tamagui';

import { IconButton } from '@/components/email-templates/IconButton';
import { RADII } from '@/constants/design';
import type { TemplateDraft } from '@/features/email-templates/draft';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  control: Control<TemplateDraft>;
  onFormat: () => void;
  onVerify: () => void;
  onImages: () => void;
  onAi: () => void;
}

/** The MJML source with the portal editor's tools: Format & tidy, Verify, Image library and the AI writer. */
export function MjmlSourceCard({ control, onFormat, onVerify, onImages, onAi }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { field } = useController({ control, name: 'mjml' });
  return (
    <YStack
      backgroundColor="$surface"
      borderRadius={RADII.md}
      borderWidth={1}
      borderColor="$borderColor"
      overflow="hidden"
    >
      <XStack
        alignItems="center"
        gap="$1"
        paddingLeft="$3"
        paddingRight="$1"
        borderBottomWidth={1}
        borderColor="$borderColor"
      >
        <MaterialIcons name="code" size={18} color={theme.muted?.val} />
        <Text flex={1} fontWeight="700" role="heading">
          {t('crm.emailTemplates.mjmlSource')}
        </Text>
        <IconButton
          icon="format-align-left"
          label={t('crm.emailTemplates.formatAndTidy')}
          onPress={onFormat}
          testID="mjml-format"
        />
        <IconButton
          icon="fact-check"
          label={t('crm.emailTemplates.verifyMjml')}
          onPress={onVerify}
          testID="mjml-verify"
        />
        <IconButton
          icon="photo-library"
          label={t('crm.emailTemplates.imageLibrary')}
          onPress={onImages}
          testID="mjml-images"
        />
        <IconButton
          icon="auto-awesome"
          tone="accent"
          label={t('crm.emailTemplates.createUpdateWithAi')}
          onPress={onAi}
          testID="mjml-ai"
        />
      </XStack>
      <TextArea
        value={field.value}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        aria-label={t('crm.emailTemplates.mjmlSource')}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        fontSize="$2"
        minHeight={280}
        borderWidth={0}
        borderRadius={0}
        backgroundColor="$surface"
        testID="mjml-source"
      />
    </YStack>
  );
}
