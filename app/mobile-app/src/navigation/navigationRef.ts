import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from '@/navigation/types';

/**
 * Container-level navigation handle for components rendered OUTSIDE any navigator.
 * The global FloatingCartButton overlay is a sibling of RootNavigator, so it has
 * no navigator ancestor — useNavigation / useNavigationState would throw there
 * ("Couldn't get the navigation state"). The container ref works from anywhere
 * inside <NavigationContainer>.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
