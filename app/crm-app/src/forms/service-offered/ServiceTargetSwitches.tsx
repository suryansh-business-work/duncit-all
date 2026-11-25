import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import {
  CRM_SERVICE_TARGETS,
  crmAllServiceTargets,
  crmHasAnyServiceTarget,
  type CrmServiceTargets,
} from '@duncit/utils';

import { RADII } from '@/constants/design';
import { Toggle } from '@/components/Toggle';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  value: CrmServiceTargets;
  onChange: (next: CrmServiceTargets) => void;
}

function TargetToggle({
  label,
  checked,
  onChange,
  testID,
}: Readonly<{ label: string; checked: boolean; onChange: (on: boolean) => void; testID: string }>) {
  return (
    <XStack alignItems="center" gap="$2" minHeight={44}>
      <Toggle checked={checked} onChange={onChange} label={label} testID={testID} />
      <Text>{label}</Text>
    </XStack>
  );
}

/**
 * One switch per lead kind a service can show on, plus "All lead types" — on
 * when every kind is on; turning it on enables every kind, off clears them.
 * At least one kind must stay on: the form will not save until one is.
 */
export function ServiceTargetSwitches({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const all = CRM_SERVICE_TARGETS.every((target) => value[target.flag]);
  return (
    <YStack gap="$2">
      <Text color="$muted" fontSize="$2" fontWeight="700" letterSpacing={0.4}>
        {t('crm.data.availableForLeadForms')}
      </Text>
      <XStack flexWrap="wrap" columnGap="$4">
        {CRM_SERVICE_TARGETS.map((target) => (
          <TargetToggle
            key={target.flag}
            label={t(target.labelKey)}
            checked={value[target.flag]}
            onChange={(on) => onChange({ ...value, [target.flag]: on })}
            testID={`service-target-${target.kind}`}
          />
        ))}
        <TargetToggle
          label={t('crm.data.allLeadTypes')}
          checked={all}
          onChange={(on) => onChange(crmAllServiceTargets(on))}
          testID="service-target-all"
        />
      </XStack>
      {crmHasAnyServiceTarget(value) ? null : (
        <XStack
          role="alert"
          aria-live="polite"
          gap="$2"
          alignItems="center"
          backgroundColor="$warningSoft"
          borderRadius={RADII.sm}
          padding="$3"
          testID="service-target-warning"
        >
          <MaterialIcons
            name="warning-amber"
            size={20}
            color={theme.warning?.val}
            accessibilityElementsHidden
          />
          <Text flex={1} color="$warning" fontWeight="600">
            {t('crm.data.turnOnAtLeastOneLeadType')}
          </Text>
        </XStack>
      )}
    </YStack>
  );
}
