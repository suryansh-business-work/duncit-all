import { YStack } from 'tamagui';
import type { ConsentCategory } from '@duncit/utils';

import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';

export type ConsentValues = Readonly<Record<ConsentCategory, boolean>>;

interface Props {
  values: ConsentValues;
  onChange: (category: ConsentCategory, checked: boolean) => void;
}

/** Essential storage cannot be turned off; its switch is shown, locked on. */
const ALWAYS_ON = () => undefined;

/**
 * The three consent rows — Essential (always on), Analytics, Marketing — as
 * the consent sheet's "Choose" view and the Privacy & data screen both render
 * them. Tamagui twin of mWeb's ConsentSwitches (rule 27).
 */
export function ConsentSwitches({ values, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const essential = `${t('privacy.categories.essential.title')} · ${t('privacy.categories.essential.alwaysOn')}`;
  return (
    <YStack gap={12}>
      <ToggleRow
        testID="consent-switch-essential"
        label={essential}
        hint={t('privacy.categories.essential.body')}
        value
        disabled
        onChange={ALWAYS_ON}
      />
      <ToggleRow
        testID="consent-switch-analytics"
        label={t('privacy.categories.analytics.title')}
        hint={t('privacy.categories.analytics.body')}
        value={values.analytics}
        onChange={(checked) => onChange('analytics', checked)}
      />
      <ToggleRow
        testID="consent-switch-marketing"
        label={t('privacy.categories.marketing.title')}
        hint={t('privacy.categories.marketing.body')}
        value={values.marketing}
        onChange={(checked) => onChange('marketing', checked)}
      />
    </YStack>
  );
}
