import { useState } from 'react';
import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { Accordion } from '@/components/details/Accordion';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ProfileMe } from '@/hooks/useProfile';

function NavRow({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: 'storefront' | 'store';
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const { primary, muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={12}
      padding={14}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      marginBottom={10}
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name={icon} size={20} color={primary} />
      <Text flex={1} fontSize={14.5} fontWeight="800" color="$color">
        {label}
      </Text>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </XStack>
  );
}

/** Profile detail panels — links + pet accordions and host/venue shortcuts. */
export function ProfilePanels({
  me,
  onOpenHost,
  onOpenVenue,
}: {
  me: ProfileMe;
  onOpenHost: () => void;
  onOpenVenue: () => void;
}) {
  const { primary } = useThemeColors();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const isHost = me.roles.includes('HOST');
  const isVenue = me.roles.includes('VENUE_OWNER');
  const pet = me.pet_profile;

  return (
    <YStack paddingHorizontal={16}>
      {me.profile_links.length > 0 ? (
        <Accordion
          title="Links"
          icon="link"
          open={open.has('links')}
          onToggle={() => toggle('links')}
          testID="accordion-links"
        >
          {me.profile_links.map((link) => (
            <XStack
              key={link.url}
              role="button"
              aria-label={link.label}
              onPress={() => void Linking.openURL(link.url)}
              alignItems="center"
              gap={8}
            >
              <MaterialIcons name="open-in-new" size={15} color={primary} />
              <Text fontSize={13.5} fontWeight="700" color="$primary">
                {link.label}
              </Text>
            </XStack>
          ))}
        </Accordion>
      ) : null}

      {pet ? (
        <Accordion
          title="Pet profile"
          icon="pets"
          open={open.has('pet')}
          onToggle={() => toggle('pet')}
          testID="accordion-pet"
        >
          <Text fontSize={14} fontWeight="800" color="$color">
            {pet.name}
          </Text>
          <Text fontSize={12.5} color="$muted">
            {[pet.species, pet.breed, pet.age ? `${pet.age} yrs` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {pet.bio ? (
            <Text fontSize={13} color="$color">
              {pet.bio}
            </Text>
          ) : null}
        </Accordion>
      ) : null}

      <NavRow
        testID="profile-host"
        icon="storefront"
        label={isHost ? 'Hosts Management' : 'Become a host'}
        onPress={onOpenHost}
      />
      <NavRow
        testID="profile-venue"
        icon="store"
        label={isVenue ? 'Venue Management' : 'Become a venue owner'}
        onPress={onOpenVenue}
      />
    </YStack>
  );
}
