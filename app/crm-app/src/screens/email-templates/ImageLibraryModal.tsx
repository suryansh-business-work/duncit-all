import { useState } from 'react';
import { FlatList, Image, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { IconButton } from '@/components/email-templates/IconButton';
import { Notice } from '@/components/email-templates/Notice';
import { ModalPage } from '@/components/ModalPage';
import { SURFACE } from '@/components/surface';
import { RADII } from '@/constants/design';
import { assetLabel, type EmailAsset } from '@/features/email-templates/draft';
import { EMAIL_MEDIA_FOLDERS, pickMedia, uploadPicked } from '@/features/email-templates/pickMedia';
import {
  CrmAppEmailTemplateAddImageDocument,
  CrmAppEmailTemplateRemoveImageDocument,
} from '@/graphql/emailTemplates';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { shareText } from './VariableChips';

const SCOPE = 'crm-app/EmailTemplateImages';

interface Props {
  open: boolean;
  templateId: string;
  images: readonly EmailAsset[];
  onChangeImages: (next: EmailAsset[]) => void;
  /** Add an <mj-image> for the image to the MJML — only when asked, never on upload. */
  onInsert: (url: string) => void;
  onClose: () => void;
}

/** The template's image library: upload (saved at once), insert, share the URL, or remove. */
export function ImageLibraryModal({
  open,
  templateId,
  images,
  onChangeImages,
  onInsert,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (work: () => Promise<EmailAsset[] | null>) => {
    setError(null);
    setBusy(true);
    try {
      const next = await work();
      if (next) onChangeImages(next);
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  const upload = () =>
    run(async () => {
      const [file] = await pickMedia();
      if (!file) return null;
      const url = await uploadPicked(file, EMAIL_MEDIA_FOLDERS.templateImages);
      const { addCrmEmailTemplateImage } = await gqlRequest(CrmAppEmailTemplateAddImageDocument, {
        id: templateId,
        image: { url, name: file.name },
      });
      return addCrmEmailTemplateImage.images;
    });

  const remove = (url: string) =>
    run(async () => {
      const { removeCrmEmailTemplateImage } = await gqlRequest(
        CrmAppEmailTemplateRemoveImageDocument,
        {
          id: templateId,
          url,
        },
      );
      return removeCrmEmailTemplateImage.images;
    });

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <ModalPage label={t('crm.emailTemplates.imageLibrary')}>
        <XStack
          alignItems="center"
          paddingLeft="$4"
          paddingRight="$2"
          borderBottomWidth={1}
          borderColor="$borderColor"
        >
          <Text flex={1} fontWeight="700" fontSize="$5" role="heading">
            {t('crm.emailTemplates.imageLibrary')}
          </Text>
          <IconButton
            icon="close"
            label={t('shell.common.close')}
            onPress={onClose}
            testID="images-close"
          />
        </XStack>
        <FlatList
          data={images}
          keyExtractor={(image) => image.url}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          ListHeaderComponent={
            <YStack gap="$3" marginBottom="$2">
              <Text color="$muted">
                {t('crm.emailTemplates.imageLibraryIntro', {
                  vars: { insert: t('crm.emailTemplates.insert') },
                })}
              </Text>
              {error ? (
                <Notice tone="error" onClose={() => setError(null)} testID="images-error">
                  {error}
                </Notice>
              ) : null}
              <DuncitButton
                label={busy ? t('crm.emailTemplates.uploading') : t('crm.emailTemplates.upload')}
                onPress={() => fireAndForget(upload(), logs.mobileApp, SCOPE, 'upload')}
                loading={busy}
                icon={<MaterialIcons name="upload" size={18} color={theme.onPrimary?.val} />}
                testID="images-upload"
              />
            </YStack>
          }
          ListEmptyComponent={
            <Text color="$muted" textAlign="center" padding="$5">
              {t('crm.emailTemplates.noImagesYetClickUpload')}
            </Text>
          }
          renderItem={({ item, index }) => (
            <XStack {...SURFACE} alignItems="center" gap="$2" testID={`image-${index}`}>
              <Image
                source={{ uri: item.url }}
                accessibilityLabel={assetLabel(item)}
                style={{ width: 64, height: 64, borderRadius: RADII.sm }}
              />
              <Text flex={1} numberOfLines={2}>
                {assetLabel(item)}
              </Text>
              <IconButton
                icon="add-photo-alternate"
                tone="accent"
                label={t('crm.emailTemplates.insertImage')}
                onPress={() => {
                  onInsert(item.url);
                  onClose();
                }}
                testID={`image-insert-${index}`}
              />
              <IconButton
                icon="share"
                label={t('crmApp.emailTemplates.shareUrl')}
                onPress={() => shareText(item.url)}
                testID={`image-share-${index}`}
              />
              <IconButton
                icon="delete-outline"
                tone="danger"
                label={t('crm.emailTemplates.removeFromLibrary')}
                onPress={() => fireAndForget(remove(item.url), logs.mobileApp, SCOPE, 'remove')}
                disabled={busy}
                testID={`image-remove-${index}`}
              />
            </XStack>
          )}
        />
      </ModalPage>
    </Modal>
  );
}
