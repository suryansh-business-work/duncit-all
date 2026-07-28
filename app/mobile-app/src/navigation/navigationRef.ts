import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from '@/navigation/types';

/**
 * Container-level navigation handle for components that must work from ANY
 * position in the tree. The global HeaderCartButton renders both from the tab
 * header and from a stack back-bar and needs the active route name in both, so
 * it reads the container ref rather than a navigator hook (useNavigation /
 * useNavigationState throw when there is no navigator ancestor).
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
