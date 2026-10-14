import { Switch, type SwitchProps } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

export type AppSwitchProps = Omit<SwitchProps, 'trackColor' | 'ios_backgroundColor'>;

/**
 * The app's one on/off switch. The off track takes `inputBorder` (3:1 against
 * every ground, WCAG 1.4.11) — left to the platform default it matched the
 * page and only the thumb showed. The on track is the brand `primary`.
 */
export function AppSwitch(props: Readonly<AppSwitchProps>) {
  const { primary, inputBorder } = useThemeColors();
  return (
    <Switch
      {...props}
      trackColor={{ false: inputBorder, true: primary }}
      ios_backgroundColor={inputBorder}
    />
  );
}
