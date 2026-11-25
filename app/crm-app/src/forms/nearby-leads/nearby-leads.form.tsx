import { useMemo } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useController, useForm, useWatch } from 'react-hook-form';
import { Label, Text, XStack, YStack, useTheme } from 'tamagui';

import { ChoiceField } from '@/components/ChoiceField';
import { DuncitButton } from '@/components/DuncitButton';
import { useNearbyPlaces } from '@/features/leads-list/useNearbyPlaces';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  NEARBY_RADIUS,
  makeNearbyLeadsSchema,
  nearbyLeadsDefaults,
  type NearbyLeadsValues,
} from './nearby-leads.types';

interface Props {
  /** The last search, so reopening starts from it. */
  initialValues?: NearbyLeadsValues | null;
  onSubmit: (values: NearbyLeadsValues) => void;
}

const clampRadius = (km: number) => Math.min(NEARBY_RADIUS.max, Math.max(NEARBY_RADIUS.min, km));

/** One radius step down or up, as the portal's slider moves. */
function RadiusStep({
  icon,
  label,
  onPress,
}: Readonly<{ icon: 'remove' | 'add'; label: string; onPress: () => void }>) {
  const theme = useTheme();
  return (
    <XStack
      role="button"
      aria-label={label}
      onPress={onPress}
      padding="$2"
      hitSlop={8}
      testID={`nearby-radius-${icon}`}
    >
      <MaterialIcons name={icon} size={24} color={theme.accentText?.val} />
    </XStack>
  );
}

/** Leads listing › Nearby leads: where to search around, and how far. */
export function NearbyLeadsForm({ initialValues, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<NearbyLeadsValues>(makeNearbyLeadsSchema(t)), [t]);
  const { control, handleSubmit, setValue } = useForm<NearbyLeadsValues>({
    defaultValues: initialValues ?? nearbyLeadsDefaults,
    resolver,
    mode: 'onSubmit',
  });
  const { field: source } = useController({ control, name: 'source' });
  const { field: radius } = useController({ control, name: 'radius_km' });
  const city = useWatch({ control, name: 'city' });
  const places = useNearbyPlaces(city, t('crmApp.common.loadFailed'));
  const km = (value: number) => t('crm.nearby.radiusValue', { vars: { km: value } });

  return (
    <YStack gap="$3">
      <YStack gap="$2">
        <Label fontWeight="600">{t('crm.nearby.centreLabel')}</Label>
        <XStack gap="$2" flexWrap="wrap" role="radiogroup" aria-label={t('crm.nearby.centreLabel')}>
          <DuncitButton
            label={t('crm.nearby.myLocation')}
            onPress={() => source.onChange('me')}
            variant={source.value === 'me' ? 'solid' : 'outline'}
            size="sm"
            testID="nearby-source-me"
          />
          <DuncitButton
            label={t('crm.nearby.pickPlace')}
            onPress={() => source.onChange('place')}
            variant={source.value === 'place' ? 'solid' : 'outline'}
            size="sm"
            testID="nearby-source-place"
          />
        </XStack>
        {source.value === 'me' ? (
          <Text color="$muted" fontSize="$2">
            {t('crmApp.leadList.myLocationHint')}
          </Text>
        ) : null}
      </YStack>

      {source.value === 'place' ? (
        <YStack gap="$3">
          <ChoiceField
            control={control}
            name="city"
            label={t('crm.common.city')}
            options={places.cities}
            searchLabel={t('crmApp.leadList.searchCities')}
            onPick={() => setValue('area', '')}
            testID="nearby-city"
          />
          {places.error ? (
            <Text color="$danger" role="alert">
              {places.error}
            </Text>
          ) : null}
          {city ? (
            <ChoiceField
              control={control}
              name="area"
              label={t('crm.forms.areaLocality')}
              options={places.areas}
              noneLabel={t('crmApp.leadList.anyArea')}
              testID="nearby-area"
            />
          ) : null}
        </YStack>
      ) : null}

      <YStack gap="$2">
        <Label fontWeight="600">{t('crm.nearby.radiusLabel')}</Label>
        <XStack gap="$2" flexWrap="wrap" role="radiogroup" aria-label={t('crm.nearby.radiusLabel')}>
          {NEARBY_RADIUS.marks.map((mark) => (
            <DuncitButton
              key={mark}
              label={km(mark)}
              onPress={() => radius.onChange(mark)}
              variant={radius.value === mark ? 'solid' : 'outline'}
              size="sm"
              testID={`nearby-radius-${mark}`}
            />
          ))}
        </XStack>
        <XStack alignItems="center" gap="$3">
          <RadiusStep
            icon="remove"
            label={t('crmApp.leadList.radiusLess')}
            onPress={() => radius.onChange(clampRadius(radius.value - NEARBY_RADIUS.step))}
          />
          <Text fontWeight="700" aria-live="polite" testID="nearby-radius-value">
            {km(radius.value)}
          </Text>
          <RadiusStep
            icon="add"
            label={t('crmApp.leadList.radiusMore')}
            onPress={() => radius.onChange(clampRadius(radius.value + NEARBY_RADIUS.step))}
          />
        </XStack>
      </YStack>

      <DuncitButton
        label={t('crm.nearby.find')}
        onPress={handleSubmit(onSubmit)}
        fullWidth
        testID="nearby-find"
      />
    </YStack>
  );
}
