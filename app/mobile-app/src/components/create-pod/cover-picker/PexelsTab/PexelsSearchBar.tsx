import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface PexelsSearchBarProps {
  query: string;
  onQuery: (query: string) => void;
  onSearch: () => void;
  muted: string;
}

/** The Pexels search box and its Search button. */
export function PexelsSearchBar({
  query,
  onQuery,
  onSearch,
  muted,
}: Readonly<PexelsSearchBarProps>) {
  const { t } = useTranslation();
  return (
    <XStack gap={8} alignItems="center">
      <XStack
        flex={1}
        alignItems="center"
        gap={6}
        paddingHorizontal={14}
        borderRadius={999}
        backgroundColor="$soft"
      >
        <MaterialIcons name="search" size={16} color={muted} />
        <Input
          testID="cover-pexels-search"
          flex={1}
          unstyled
          value={query}
          onChangeText={onQuery}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          placeholder={t('mweb.createPod.searchPhotos')}
          aria-label={t('mweb.createPod.searchPhotos')}
          color="$color"
          placeholderTextColor="$muted"
          height={40}
        />
      </XStack>
      <XStack
        testID="cover-pexels-go"
        tabIndex={0}
        role="button"
        aria-label={t('mweb.createPod.searchPexels')}
        onPress={onSearch}
        height={40}
        paddingHorizontal={16}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$primary"
        pressStyle={PRESS_STYLE.solid}
      >
        <Text fontSize={13} fontWeight="600" color="$onPrimary">
          {t('mweb.createPod.search')}
        </Text>
      </XStack>
    </XStack>
  );
}
