import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { usePexelsPhotos, type PexelsPhoto } from './usePexelsPhotos';

const TILE = 104;

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
 * Tapping imports the photo into our own ImageKit account and adds the hosted
 * URL to the tray; the tile keeps a tick so the grid says what was chosen. It
 * does NOT close the sheet — the whole point is picking several.
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
  const pexels = usePexelsPhotos(seed, orientation, active);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  const pick = async (photo: PexelsPhoto) => {
    if (importingId) return;
    setImportingId(String(photo.id));
    try {
      const url = await pexels.importPhoto(photo);
      onPicked(url);
      setPickedIds((current) => [...current, String(photo.id)]);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not add that photo');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <YStack gap={10} testID="cover-pexels-tab">
      <XStack gap={8} alignItems="center">
        <XStack
          flex={1}
          alignItems="center"
          gap={6}
          paddingHorizontal={10}
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
        >
          <MaterialIcons name="search" size={16} color={muted} />
          <Input
            testID="cover-pexels-search"
            flex={1}
            unstyled
            value={pexels.query}
            onChangeText={pexels.setQuery}
            onSubmitEditing={pexels.search}
            returnKeyType="search"
            placeholder="Search photos"
            color="$color"
            placeholderTextColor="$muted"
            height={40}
          />
        </XStack>
        <XStack
          testID="cover-pexels-go"
          role="button"
          aria-label="Search Pexels"
          onPress={pexels.search}
          height={40}
          paddingHorizontal={14}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          backgroundColor="$primary"
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={13} fontWeight="700" color="$onPrimary">
            Search
          </Text>
        </XStack>
      </XStack>

      {pexels.error ? (
        <Text testID="cover-pexels-error" fontSize={12} color="$danger">
          {pexels.error}
        </Text>
      ) : null}

      {pexels.searching && pexels.photos.length === 0 ? (
        <YStack paddingVertical={28} alignItems="center">
          <Spinner color="$primary" />
        </YStack>
      ) : null}

      {!pexels.searching && pexels.photos.length === 0 ? (
        <Text fontSize={12.5} color="$muted">
          No photos matched. Try a different word.
        </Text>
      ) : null}

      <XStack flexWrap="wrap" gap={8}>
        {pexels.photos.map((photo) => {
          const id = String(photo.id);
          const picked = pickedIds.includes(id);
          const frozen = (atLimit && !picked) || (!!importingId && importingId !== id);
          return (
            <YStack
              key={id}
              testID={`cover-pexels-${id}`}
              role="button"
              aria-label={photo.alt || `Photo by ${photo.photographer ?? 'Pexels'}`}
              aria-disabled={frozen}
              onPress={frozen ? undefined : () => void pick(photo)}
              width={TILE}
              height={TILE}
              borderRadius={10}
              overflow="hidden"
              borderWidth={picked ? 2 : 1}
              borderColor={picked ? '$primary' : '$borderColor'}
              backgroundColor={photo.avg_color ?? '$surface'}
              opacity={frozen ? 0.45 : 1}
              pressStyle={{ opacity: 0.85 }}
            >
              <AppImage
                source={{ uri: photo.src_medium ?? photo.src_tiny ?? '' }}
                style={{ width: TILE, height: TILE }}
              />
              {importingId === id ? (
                <YStack
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="rgba(0,0,0,0.35)"
                >
                  <Spinner color="#ffffff" />
                </YStack>
              ) : null}
              {picked ? (
                <YStack position="absolute" top={4} right={4}>
                  <MaterialIcons name="check-circle" size={20} color={primary} />
                </YStack>
              ) : null}
            </YStack>
          );
        })}
      </XStack>

      {pexels.hasMore ? (
        <XStack
          testID="cover-pexels-more"
          role="button"
          aria-label="Load more photos"
          onPress={pexels.loadMore}
          height={42}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={13} fontWeight="600" color="$color">
            {pexels.searching ? 'Loading…' : 'Load more'}
          </Text>
        </XStack>
      ) : null}

      <Text fontSize={11} color="$muted">
        Photos provided by Pexels. Picked photos are copied into your own media library.
      </Text>
    </YStack>
  );
}
