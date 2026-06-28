import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PostViewerSheet } from '@/components/profile/post-viewer/PostViewerSheet';
import { useProfile } from '@/hooks/useProfile';
import type { RootStackParamList } from '@/navigation/types';

/** Deep-link target for post-activity notifications (`post/:postId`). Opens the
 * shared PostViewerSheet on the post; closing/deleting returns to the previous
 * screen. RN twin of mWeb's /post/:postId route. */
export function PostDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PostDetail'>>();
  const postId = route.params?.postId ?? '';
  const { me } = useProfile();

  const goBack = () => navigation.goBack();

  return <PostViewerSheet postId={postId} meId={me?.user_id} onClose={goBack} onDeleted={goBack} />;
}
