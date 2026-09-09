import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import type { ContactsScope } from '@/hooks/useContacts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

const SCOPES: ContactsScope[] = ['all', 'nearby', 'invite'];

interface Props {
  scope: ContactsScope;
  onScope: (scope: ContactsScope) => void;
  search: string;
  onSearch: (value: string) => void;
}

/** The three lists this screen holds: everyone matched, only the matches in
 * the viewer's city, and the contacts who are not here yet — plus the search
 * the three share. Twin of mWeb's `ContactsToolbar` (rule 27). */
export function ContactsFilters({ scope, onScope, search, onSearch }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const labels: Record<ContactsScope, string> = {
    all: t('mweb.contacts.filterAll'),
    nearby: t('mweb.contacts.filterNearby'),
    invite: t('mweb.contacts.filterInvite'),
  };
  return (
    <YStack gap={10} paddingHorizontal={16}>
      <XStack gap={8}>
        {SCOPES.map((value) => {
          const selected = scope === value;
          return (
            <XStack
              key={value}
              testID={`contacts-scope-${value}`}
              role="button"
              aria-pressed={selected}
              onPress={() => onScope(value)}
              flex={1}
              height={36}
              alignItems="center"
              justifyContent="center"
              borderRadius={12}
              backgroundColor={selected ? '$primary' : '$surface'}
              borderWidth={1}
              borderColor={selected ? '$primary' : '$borderColor'}
              pressStyle={PRESS_STYLE.control}
            >
              <Text fontSize={13} fontWeight="700" color={selected ? '$onPrimary' : '$color'}>
                {labels[value]}
              </Text>
            </XStack>
          );
        })}
      </XStack>
      <XStack
        alignItems="center"
        gap={8}
        paddingHorizontal={12}
        height={46}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
      >
        <MaterialIcons name="search" size={20} color={muted} />
        <Input
          testID="contacts-search"
          aria-label={t('mweb.contacts.searchPlaceholder')}
          flex={1}
          unstyled
          value={search}
          onChangeText={onSearch}
          placeholder={t('mweb.contacts.searchPlaceholder')}
          placeholderTextColor="$muted"
          color="$color"
          fontSize={15}
          returnKeyType="search"
        />
      </XStack>
    </YStack>
  );
}
