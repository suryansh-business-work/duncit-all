import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { PublicPageKind, PublicPageLink } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { usePublicPageActions } from './usePublicPageActions';

const QR_SIZE = 168;
const ICON_SIZE = 18;

interface Props {
  kind: PublicPageKind;
  refId: string | null;
  title: string;
  link: PublicPageLink;
}

/**
 * The published page's link: the URL, Copy / Share / Open, the QR and the two
 * downloads (QR as PNG, printable A4 poster as PDF). mWeb twin:
 * public-page/PublicPageLinkPanel (rule 27) — the testIDs are shared.
 */
export function PublicPageLinkPanel({ kind, refId, title, link }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, accent } = useThemeColors();
  const actions = usePublicPageActions(kind, refId, title, link);
  // Soft buttons paint their label in the accent; outline ones in ink.
  const icon = (name: keyof typeof MaterialIcons.glyphMap, tint = ink) => (
    <MaterialIcons name={name} size={ICON_SIZE} color={tint} />
  );

  return (
    <YStack testID="public-page-link" gap={12}>
      <YStack gap={4}>
        <Text fontSize={12} fontWeight="600" color="$muted">
          {t('publicPage.link.label')}
        </Text>
        <Text
          testID="public-page-link-url"
          fontSize={15}
          fontWeight="600"
          color="$color"
          selectable
          numberOfLines={2}
        >
          {link.url}
        </Text>
      </YStack>
      <XStack gap={8} flexWrap="wrap">
        <DuncitButton
          testID="public-page-copy-link"
          label={t('publicPage.link.copy')}
          variant="outline"
          tone="neutral"
          size="sm"
          icon={icon('content-copy')}
          onPress={() => fireAndForget(actions.copy())}
        />
        <DuncitButton
          testID="public-page-share-link"
          label={t('publicPage.link.share')}
          variant="outline"
          tone="neutral"
          size="sm"
          icon={icon('share')}
          onPress={() => fireAndForget(actions.share())}
        />
        <DuncitButton
          testID="public-page-open-link"
          label={t('publicPage.link.open')}
          variant="outline"
          tone="neutral"
          size="sm"
          icon={icon('open-in-new')}
          onPress={() => fireAndForget(actions.open())}
        />
      </XStack>
      <YStack alignItems="center" gap={12}>
        <YStack padding={8} borderRadius={16} backgroundColor="$background">
          <AppImage
            testID="public-page-qr"
            source={{ uri: link.qr_data_url }}
            resizeMode="contain"
            style={{ width: QR_SIZE, height: QR_SIZE }}
            accessibilityLabel={t('publicPage.link.qrAlt', { vars: { name: title } })}
          />
        </YStack>
        <DuncitButton
          testID="public-page-download-qr"
          label={t('publicPage.link.downloadQr')}
          variant="soft"
          fullWidth
          loading={actions.busy === 'qr'}
          disabled={actions.busy !== null}
          icon={icon('qr-code-2', accent)}
          onPress={() => fireAndForget(actions.downloadQr())}
        />
        <DuncitButton
          testID="public-page-download-poster"
          label={
            actions.busy === 'poster'
              ? t('publicPage.link.preparingPoster')
              : t('publicPage.link.downloadPoster')
          }
          variant="soft"
          fullWidth
          loading={actions.busy === 'poster'}
          disabled={actions.busy !== null}
          icon={icon('picture-as-pdf', accent)}
          onPress={() => fireAndForget(actions.downloadPoster())}
        />
      </YStack>
      {actions.notice ? (
        <Text
          testID="public-page-notice"
          role={actions.notice.tone === 'danger' ? 'alert' : 'status'}
          fontSize={13}
          color={actions.notice.tone === 'danger' ? '$danger' : '$success'}
        >
          {actions.notice.text}
        </Text>
      ) : null}
    </YStack>
  );
}
