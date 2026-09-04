import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from '@/navigation/types';

/**
 * Container-level navigation handle for components that must work from ANY
 * position in the tree — anything rendered outside a navigator, or shared by
 * screens in different navigators, reads the active route and navigates through
 * this rather than a navigator hook (useNavigation / useNavigationState throw
 * when there is no navigator ancestor).
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
