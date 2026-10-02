import { useState } from 'react';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { ImageViewerModal } from '@/components/ImageViewerModal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { usePexelsPhotos, type PexelsPhoto } from '../usePexelsPhotos';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { fireAndForget } from '@/utils/fire-and-forget';

import { PexelsSearchBar } from './PexelsSearchBar';
import { PexelsTile } from './PexelsTile';

interface Props {
  active: boolean;
  /** Seeded from the pod's sub-category. */
  seed: string;
  /** Cover images are wide, so this arrives as 'landscape'. */
  orientation: string;
  /** True once the tray is full — unpicked tiles stop responding. */
  atLimit: boolean;
  onPicked: (url: string) => void;
  onError: (message: string) => void;
}

/**
 * Stock photos for a pod cover — the Tamagui twin of the package's
 * PexelsPhotosTab (rule 27).
 *
 * Tapping a tile only OPENS it full-screen; nothing is uploaded until the host
 * confirms with "Use this image" in the viewer. A 104px thumbnail is far too
 * small to judge a cover by, and importing on tap meant every look cost an
 * upload into our ImageKit account (and a tray slot) that then had to be undone.
 * Confirming imports the photo and adds the hosted URL to the tray; the tile
 * keeps a tick so the grid says what was chosen. It does NOT close the sheet —
 * the whole point is picking several.
 */
export function PexelsTab({
  active,
  seed,
  orientation,
  atLimit,
  onPicked,
  onError,
}: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const { t } = useTranslation();
  const loadMore = t('mweb.createPod.loadMore');
  const pexels = usePexelsPhotos(seed, orientation, active);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<PexelsPhoto | null>(null);

  const confirmPreview = async () => {
    const photo = preview;
    if (!photo || importingId) return;
    setImportingId(String(photo.id));
    try {
      const url = await pexels.importPhoto(photo);
      onPicked(url);
      setPickedIds((current) => [...current, String(photo.id)]);
      setPreview(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('mweb.createPod.photoImportFailed'));
    } finally {
      setImportingId(null);
    }
  };

  const previewId = preview ? String(preview.id) : null;
  const previewPicked = !!previewId && pickedIds.includes(previewId);
  const previewSource = preview?.src_large ?? preview?.src_medium ?? preview?.src_tiny ?? '';
  const previewCredit = preview?.photographer
    ? t('mweb.createPod.photoCredit', { vars: { name: preview.photographer } })
    : undefined;

  return (
    <YStack gap={10} testID="cover-pexels-tab">
      <PexelsSearchBar
        query={pexels.query}
        onQuery={pexels.setQuery}
        onSearch={pexels.search}
        muted={muted}
      />

      {pexels.error ? (
        <Text role="alert" testID="cover-pexels-error" fontSize={12} color="$danger">
          {pexels.error}
        </Text>
      ) : null}

      {pexels.searching && pexels.photos.length === 0 ? (
        <YStack paddingVertical={28} alignItems="center">
          <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />
        </YStack>
      ) : null}

      {!pexels.searching && pexels.photos.length === 0 ? (
        <Text fontSize={12.5} color="$muted">
          {t('mweb.createPod.noPhotos')}
        </Text>
      ) : null}

      <XStack flexWrap="wrap" gap={8}>
        {pexels.photos.map((photo) => {
          const id = String(photo.id);
          const picked = pickedIds.includes(id);
          const frozen = (atLimit && !picked) || (!!importingId && importingId !== id);
          return (
            <PexelsTile
              key={id}
              photo={photo}
              id={id}
              picked={picked}
              frozen={frozen}
              importing={importingId === id}
              primary={primary}
              onOpen={setPreview}
            />
          );
        })}
      </XStack>

      {pexels.hasMore ? (
        <XStack
          testID="cover-pexels-more"
          tabIndex={0}
          role="button"
          aria-label={loadMore}
          onPress={pexels.loadMore}
          height={44}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$soft"
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={13} fontWeight="600" color="$color">
            {pexels.searching ? t('mweb.createPod.loading') : loadMore}
          </Text>
        </XStack>
      ) : null}

      <Text fontSize={11} color="$muted">
        {t('mweb.createPod.pexelsNotice')}
      </Text>

      {/* Look before committing: the import (and the tray slot it takes) only
          happens when the host confirms. An already-picked photo gets no action
          so the same one cannot be imported twice. */}
      <ImageViewerModal
        images={previewSource ? [previewSource] : []}
        index={preview ? 0 : null}
        onClose={() => setPreview(null)}
        caption={previewCredit}
        action={
          previewPicked
            ? undefined
            : {
                label: t('mweb.createPod.useThisImage'),
                onPress: () => fireAndForget(confirmPreview()),
                busy: !!importingId,
              }
        }
      />
    </YStack>
  );
}
