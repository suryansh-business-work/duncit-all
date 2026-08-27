import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { ChipArrayField } from './ChipArrayField';
import type { CreatePodForm } from './create-pod.types';
import { PRESS_STYLE } from '@duncit/buttons-native';

type PanelKey = 'info' | 'perks';
type IconName = keyof typeof MaterialIcons.glyphMap;

const PANELS: { key: PanelKey; titleKey: string; subtitleKey: string; icon: IconName }[] = [
  {
    key: 'info',
    titleKey: 'mweb.createPod.additionalInfoTitle',
    subtitleKey: 'mweb.createPod.additionalInfoSubtitle',
    icon: 'info-outline',
  },
  {
    key: 'perks',
    titleKey: 'mweb.createPod.perksTitle',
    subtitleKey: 'mweb.createPod.perksSubtitle',
    icon: 'star-outline',
  },
];

function PanelBody({ panelKey, form }: Readonly<{ panelKey: PanelKey; form: CreatePodForm }>) {
  const { t } = useTranslation();
  if (panelKey === 'info') {
    return (
      <FormTextField
        control={form.control}
        name="pod_info"
        label={t('mweb.createPod.podInfoLabel')}
        multiline
      />
    );
  }
  return (
    <Controller
      control={form.control}
      name="available_perks"
      render={({ field, fieldState }) => (
        <ChipArrayField
          label={t('mweb.createPod.perksFieldLabel')}
          value={field.value}
          onChange={field.onChange}
          error={fieldState.error?.message}
          placeholder={t('mweb.createPod.perksPlaceholder')}
          testID="create-pod-perks"
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
  const { t } = useTranslation();
  const info = form.watch('pod_info');
  const perks = form.watch('available_perks');

  const filledFor = (key: PanelKey) => (key === 'info' ? info.trim().length > 0 : perks.length > 0);
  const summaryFor = (key: PanelKey): string => {
    if (!filledFor(key)) return t('mweb.createPod.summaryAdd');
    if (key === 'info') return t('mweb.createPod.summaryAdded');
    return t('mweb.createPod.summaryCount', { vars: { count: perks.length } });
  };

  return (
    <YStack gap={10}>
      <Text fontSize={12} fontWeight="700" color="$muted" letterSpacing={1}>
        {t('mweb.createPod.optionalSettings')}
      </Text>
      {PANELS.map((panel) => {
        const open = active === panel.key;
        const summary = summaryFor(panel.key);
        const filled = filledFor(panel.key);
        const title = t(panel.titleKey);
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
              aria-label={title}
              aria-expanded={open}
              onPress={() => setActive(open ? null : panel.key)}
              padding={12}
              gap={10}
              alignItems="center"
              pressStyle={PRESS_STYLE.row}
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
                <Text fontSize={14} fontWeight="700" color="$color">
                  {title}
                </Text>
                <Text fontSize={12} color="$muted">
                  {t(panel.subtitleKey)}
                </Text>
              </YStack>
              {filled ? (
                <Text fontSize={12} fontWeight="600" color="$primary">
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
