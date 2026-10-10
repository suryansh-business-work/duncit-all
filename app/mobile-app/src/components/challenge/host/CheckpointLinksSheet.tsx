import { useEffect, useState } from 'react';
import { Share } from 'react-native';
import { Text, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import type { MobilePodChallengeCheckpointLinksQuery } from '@/generated/graphql/graphql';
import { PodChallengeCheckpointLinksDocument } from '@/graphql/challenge-tools';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';

type Link = MobilePodChallengeCheckpointLinksQuery['podChallengeCheckpointLinks'][number];

interface Props {
  challengeId: string;
  /** The Checkpoint tool whose codes to show; null keeps the sheet closed. */
  toolInstanceId: string | null;
  onClose: () => void;
}

/**
 * The QR code to post at each checkpoint — the Tamagui twin of mWeb's
 * CheckpointLinksDialog (rule 27). The codes are fetched only when a host
 * opens this; they never ride along with the challenge everyone else receives.
 */
export function CheckpointLinksSheet({ challengeId, toolInstanceId, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [links, setLinks] = useState<Link[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!toolInstanceId) return undefined;
    let active = true;
    setLinks(null);
    setError('');
    graphqlRequest(
      PodChallengeCheckpointLinksDocument,
      { id: challengeId, toolInstanceId },
      { auth: true },
    )
      .then((res) => active && setLinks(res.podChallengeCheckpointLinks))
      .catch((e: unknown) => active && setError((e as Error).message));
    return () => {
      active = false;
    };
  }, [challengeId, toolInstanceId]);

  const share = async (link: Link) => {
    try {
      await Share.share({
        message: `${link.label}\n${link.url}`,
        url: link.url,
        title: link.label,
      });
    } catch (e) {
      // Closing the share sheet rejects on some platforms; anything else is worth showing.
      if ((e as Error).message) setError((e as Error).message);
    }
  };

  return (
    <DuncitDialog
      open={!!toolInstanceId}
      onClose={onClose}
      testID="challenge-checkpoint-links"
      title={t('mweb.challenge.tools.checkpointQr')}
      subtitle={t('mweb.challenge.tools.checkpointQrHint')}
      closeLabel={t('mweb.common.close')}
    >
      <YStack gap={20}>
        {error ? <NoticeCard tone="danger" title={error} /> : null}
        {!links && !error ? <LoadingIndicator /> : null}
        {(links ?? []).map((link) => (
          <YStack key={link.item_key} gap={8} alignItems="center">
            <AppImage
              accessibilityLabel={t('mweb.challenge.tools.qrAlt', { vars: { label: link.label } })}
              source={{ uri: link.qr_data_url }}
              style={{ width: 220, height: 220 }}
              resizeMode="contain"
            />
            <Text fontSize={15} fontWeight="700" color="$color" textAlign="center">
              {link.label}
            </Text>
            <DuncitButton
              size="sm"
              variant="outline"
              label={t('mweb.challenge.share')}
              onPress={() => fireAndForget(share(link))}
              testID={`challenge-checkpoint-share-${link.item_key}`}
            />
          </YStack>
        ))}
      </YStack>
    </DuncitDialog>
  );
}
