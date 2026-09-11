import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { ChipArrayField } from './ChipArrayField';
import type { CreatePodForm } from './create-pod.types';
import { PRESS_STYLE } from '@duncit/buttons-native';

type PanelKey = 'info' | 'perks';
type IconName = keyof typeof MaterialIcons.glyphMap;

const PANELS: { key: PanelKey; titleKey: string; icon: IconName }[] = [
  { key: 'info', titleKey: 'mweb.createPod.additionalInfoTitle', icon: 'info-outline' },
  { key: 'perks', titleKey: 'mweb.createPod.perksTitle', icon: 'star-outline' },
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
  const { accent, muted } = useThemeColors();
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
    <SurfaceCard padding={0} overflow="hidden">
      {PANELS.map((panel, index) => {
        const open = active === panel.key;
        const summary = summaryFor(panel.key);
        const filled = filledFor(panel.key);
        const title = t(panel.titleKey);
        return (
          <YStack
            key={panel.key}
            borderTopWidth={index === 0 ? 0 : 1}
            borderTopColor="$borderColor"
          >
            <XStack
              testID={`optional-${panel.key}`}
              role="button"
              aria-label={title}
              aria-expanded={open}
              onPress={() => setActive(open ? null : panel.key)}
              paddingHorizontal={16}
              paddingVertical={14}
              gap={12}
              alignItems="center"
              pressStyle={PRESS_STYLE.row}
            >
              <YStack
                width={40}
                height={40}
                borderRadius={20}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$soft"
              >
                <MaterialIcons name={panel.icon} size={20} color={accent} />
              </YStack>
              <Text flex={1} fontSize={15} fontWeight="600" color="$color">
                {title}
              </Text>
              {filled ? (
                <XStack
                  height={26}
                  alignItems="center"
                  paddingHorizontal={10}
                  borderRadius={999}
                  backgroundColor="$primary"
                >
                  <Text fontSize={12} fontWeight="600" color="$onPrimary">
                    {summary}
                  </Text>
                </XStack>
              ) : (
                <MaterialIcons
                  name={open ? 'expand-less' : 'chevron-right'}
                  size={22}
                  color={muted}
                />
              )}
            </XStack>
            {open ? (
              <YStack paddingHorizontal={16} paddingBottom={16}>
                <PanelBody panelKey={panel.key} form={form} />
              </YStack>
            ) : null}
          </YStack>
        );
      })}
    </SurfaceCard>
  );
}
