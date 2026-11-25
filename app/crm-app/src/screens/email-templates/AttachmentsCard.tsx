import { useState } from 'react';
import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { IconButton } from '@/components/email-templates/IconButton';
import { Notice } from '@/components/email-templates/Notice';
import { SURFACE } from '@/components/surface';
import { assetLabel, type EmailAsset } from '@/features/email-templates/draft';
import { EMAIL_MEDIA_FOLDERS, pickMedia, uploadPicked } from '@/features/email-templates/pickMedia';
import { useTranslation } from '@/hooks/useTranslation';
import { errorMessage } from '@/utils/errors';

const SCOPE = 'crm-app/EmailTemplateAttachments';
/** The portal's cap per attachment. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

interface Props {
  attachments: readonly EmailAsset[];
  onAdd: (asset: EmailAsset) => void;
  onRemove: (index: number) => void;
}

/** Image or video files sent with every email that uses the template; saved with the template. */
export function AttachmentsCard({ attachments, onAdd, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Why a picked file cannot be attached, or null when it can. */
  const problem = (mimeType: string, sizeBytes: number | null): string | null => {
    if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
      return t('crm.emailTemplates.onlyImageOrVideoFilesAre');
    }
    return (sizeBytes ?? 0) > MAX_ATTACHMENT_BYTES
      ? t('crm.emailTemplates.max25mbPerAttachment')
      : null;
  };

  const add = async () => {
    setError(null);
    setBusy(true);
    try {
      const [file] = await pickMedia({ videos: true });
      const refused = file ? problem(file.mimeType, file.sizeBytes) : null;
      if (refused) setError(refused);
      else if (file)
        onAdd({ url: await uploadPicked(file, EMAIL_MEDIA_FOLDERS.attachments), name: file.name });
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={t('crm.emailTemplates.attachments')} testID="attachments-card">
      <Text color="$muted" fontSize="$2">
        {t('crm.emailTemplates.imageOrVideoSentWithEvery')}
      </Text>
      {error ? (
        <Notice tone="error" onClose={() => setError(null)} testID="attachments-error">
          {error}
        </Notice>
      ) : null}
      {attachments.map((asset, index) => (
        <XStack key={asset.url} {...SURFACE} alignItems="center" gap="$2" paddingVertical="$1">
          <MaterialIcons name="attach-file" size={18} color={theme.muted?.val} />
          <Text
            flex={1}
            role="link"
            color="$accentText"
            numberOfLines={1}
            onPress={() => fireAndForget(Linking.openURL(asset.url), logs.mobileApp, SCOPE, 'open')}
            testID={`attachment-open-${index}`}
          >
            {assetLabel(asset)}
          </Text>
          <IconButton
            icon="close"
            tone="danger"
            label={t('shell.a11y.removeNamed', { vars: { name: assetLabel(asset) } })}
            onPress={() => onRemove(index)}
            testID={`attachment-remove-${index}`}
          />
        </XStack>
      ))}
      <DuncitButton
        label={busy ? t('crm.emailTemplates.uploading') : t('crm.emailTemplates.addFile')}
        onPress={() => fireAndForget(add(), logs.mobileApp, SCOPE, 'add')}
        variant="outline"
        loading={busy}
        icon={<MaterialIcons name="attach-file" size={18} color={theme.accentText?.val} />}
        testID="attachments-add"
      />
    </Card>
  );
}
