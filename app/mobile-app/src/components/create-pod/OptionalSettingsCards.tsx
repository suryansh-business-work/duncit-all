import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ChipArrayField } from './ChipArrayField';
import type { CreatePodForm } from './create-pod.types';

type PanelKey = 'info' | 'offers' | 'perks';
type IconName = keyof typeof MaterialIcons.glyphMap;

const PANELS: { key: PanelKey; title: string; subtitle: string; icon: IconName }[] = [
  {
    key: 'info',
    title: 'Additional Info',
    subtitle: 'Rules, requirements, or what to bring.',
    icon: 'info-outline',
  },
  { key: 'offers', title: 'Offers', subtitle: 'Discounts / promos', icon: 'local-offer' },
  { key: 'perks', title: 'Perks', subtitle: 'Member benefits', icon: 'star-outline' },
];

function PanelBody({ panelKey, form }: Readonly<{ panelKey: PanelKey; form: CreatePodForm }>) {
  if (panelKey === 'info') {
    return <FormTextField control={form.control} name="pod_info" label="Pod info" multiline />;
  }
  const name = panelKey === 'offers' ? 'what_this_pod_offers' : 'available_perks';
  const placeholder =
    panelKey === 'offers' ? 'e.g. Coaching, Snacks' : 'e.g. Free parking, Goodies';
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <ChipArrayField
          label={panelKey === 'offers' ? 'What this pod offers' : 'Available perks'}
          value={field.value}
          onChange={field.onChange}
          error={fieldState.error?.message}
          placeholder={placeholder}
          testID={`create-pod-${panelKey}`}
        />
      )}
    />
  );
}

/** Step 1 optional settings — three tap-to-expand cards (Additional Info,
 * Offers, Perks) revealing the matching form field(s). Mobile twin of mWeb's
 * OptionalSettingsCards. */
export function OptionalSettingsCards({ form }: Readonly<{ form: CreatePodForm }>) {
  const [active, setActive] = useState<PanelKey | null>(null);
  const { color, onPrimary } = useThemeColors();
  const info = form.watch('pod_info');
  const offers = form.watch('what_this_pod_offers');
  const perks = form.watch('available_perks');

  const summaryFor = (key: PanelKey): string => {
    if (key === 'info') return info.trim() ? 'Added' : 'Add';
    const list = key === 'offers' ? offers : perks;
    return list.length > 0 ? `${list.length} added` : 'Add';
  };

  return (
    <YStack gap={10}>
      <Text fontSize={12} fontWeight="900" color="$muted" letterSpacing={1}>
        OPTIONAL SETTINGS
      </Text>
      {PANELS.map((panel) => {
        const open = active === panel.key;
        const summary = summaryFor(panel.key);
        const filled = summary !== 'Add';
        return (
          <YStack
            key={panel.key}
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius={12}
            overflow="hidden"
          >
            <XStack
              testID={`optional-${panel.key}`}
              role="button"
              aria-label={panel.title}
              aria-expanded={open}
              onPress={() => setActive(open ? null : panel.key)}
              padding={12}
              gap={10}
              alignItems="center"
              pressStyle={{ opacity: 0.7 }}
            >
              <YStack
                width={36}
                height={36}
                borderRadius={18}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$primary"
              >
                <MaterialIcons name={panel.icon} size={18} color={onPrimary} />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={14} fontWeight="900" color="$color">
                  {panel.title}
                </Text>
                <Text fontSize={12} color="$muted">
                  {panel.subtitle}
                </Text>
              </YStack>
              {filled ? (
                <Text fontSize={12} fontWeight="800" color="$primary">
                  {summary}
                </Text>
              ) : (
                <MaterialIcons
                  name={open ? 'expand-less' : 'chevron-right'}
                  size={22}
                  color={color}
                />
              )}
            </XStack>
            {open ? (
              <YStack padding={12} paddingTop={0}>
                <PanelBody panelKey={panel.key} form={form} />
              </YStack>
            ) : null}
          </YStack>
        );
      })}
    </YStack>
  );
}
