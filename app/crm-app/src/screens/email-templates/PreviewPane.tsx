import { useState } from 'react';
import { Modal } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { HtmlPreview } from '@/components/email-templates/HtmlPreview';
import { IconButton } from '@/components/email-templates/IconButton';
import { Notice } from '@/components/email-templates/Notice';
import { ModalPage } from '@/components/ModalPage';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  name: string;
  html: string;
  errors: readonly string[];
}

/** How many render warnings the preview lists, as the portal's (the rest are in Verify MJML's count). */
const SHOWN_ERRORS = 3;

/** The live render with each variable's default value, and the same render full screen. */
export function PreviewPane({ name, html, errors }: Readonly<Props>) {
  const { t } = useTranslation();
  const [fullscreen, setFullscreen] = useState(false);
  return (
    <YStack gap="$2">
      <XStack alignItems="center" justifyContent="flex-end">
        <IconButton
          icon="fullscreen"
          label={t('crm.emailTemplates.fullScreenPreview')}
          onPress={() => setFullscreen(true)}
          testID="preview-fullscreen"
        />
      </XStack>
      {errors.length > 0 ? (
        <Notice tone="warning" testID="preview-errors">
          {errors.slice(0, SHOWN_ERRORS).join(' · ')}
        </Notice>
      ) : null}
      <HtmlPreview
        html={html}
        label={t('crm.emailTemplates.previewFrame')}
        testID="preview-frame"
      />
      <Modal visible={fullscreen} animationType="slide" onRequestClose={() => setFullscreen(false)}>
        <ModalPage label={t('crm.emailTemplates.fullScreenPreview')}>
          <XStack
            alignItems="center"
            paddingLeft="$4"
            paddingRight="$2"
            paddingVertical="$1"
            borderBottomWidth={1}
            borderColor="$borderColor"
          >
            <Text flex={1} fontWeight="700" fontSize="$5" role="heading" numberOfLines={1}>
              {t('crm.emailTemplates.previewNamed', { vars: { name } })}
            </Text>
            <IconButton
              icon="close"
              label={t('crm.emailTemplates.closeFullScreen')}
              onPress={() => setFullscreen(false)}
              testID="preview-fullscreen-close"
            />
          </XStack>
          <YStack flex={1} padding="$4">
            <HtmlPreview
              html={html}
              label={t('crm.emailTemplates.previewFrameFullscreen')}
              fill
              testID="preview-frame-fullscreen"
            />
          </YStack>
        </ModalPage>
      </Modal>
    </YStack>
  );
}
