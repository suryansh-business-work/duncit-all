import type { NavigationProp } from '@react-navigation/native';

import type { NavTarget } from './crmNav';
import type { AppStackParamList } from './types';

/** Open where a sidebar page points: its screen, a tab, a kind's lead list or a managed list. */
export function openNavTarget(
  navigation: NavigationProp<AppStackParamList>,
  target: NavTarget | undefined,
): void {
  if (!target) return;
  if (target.type === 'screen') navigation.navigate(target.screen);
  else if (target.type === 'tab') navigation.navigate('Tabs', { screen: target.tab });
  else if (target.type === 'leads') navigation.navigate('LeadList', { kind: target.kind });
  else navigation.navigate('ManagedOptions', { group: target.group });
}
