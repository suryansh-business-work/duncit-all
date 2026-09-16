import { Linking } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ComponentProps } from 'react';

import type { RootStackParamList } from '@/navigation/types';
import type { StoryTarget } from '@/hooks/useStoryRail';
import type { AdStory } from '@/components/status/adStory';
import type { OfficialStory } from '@/components/status/officialStory';
import type { StatusViewer } from '@/components/status/StatusViewer';
import { fireAndForget } from '@/utils/fire-and-forget';

/** What the full-screen viewer can show — a rail item, the sponsored story or
 * the pinned Duncit group. */
export type ViewerStatus = NonNullable<ComponentProps<typeof StatusViewer>['status']>;

/** Where a rail item's "Open details" leads. Kept out of the rail so the rail
 * itself only closes the viewer and hands the target over. */
export function openStoryTarget(
  target: StoryTarget,
  navigation: NativeStackNavigationProp<RootStackParamList>,
  openClub: (clubSlug: string) => void,
) {
  if (target.kind === 'club') {
    openClub(target.clubSlug);
    return;
  }
  if (target.kind === 'link') {
    fireAndForget(Linking.openURL(target.url));
    return;
  }
  navigation.navigate('PublicProfile', { userId: target.id });
}

/**
 * Open a Duncit status's "See more" link. A path goes through the app's OWN
 * deep link, so `navigation/linking.ts` decides which screen it is — one map,
 * never a second copy here that would drift the first time a route moved (the
 * leading slash is what marks it in-app, matching OfficialStatusSlide's
 * `linkInternal`). An https link is handed to the browser, which leaves the app.
 */
export function openOfficialLink(url: string) {
  fireAndForget(Linking.openURL(url.startsWith('/') ? ExpoLinking.createURL(url) : url));
}

/**
 * Which story the viewer shows. The Duncit group and the sponsored story open on
 * their OWN — neither is somebody's story to walk to — so each takes precedence
 * over the ordered list while it is open.
 */
export function pickViewerStatus(
  open: { official: boolean; ad: boolean },
  stories: { official: OfficialStory | null; ad: AdStory | null; active?: ViewerStatus },
): ViewerStatus | null {
  if (open.official) return stories.official;
  if (open.ad) return stories.ad;
  return stories.active ?? null;
}

/**
 * Whose "watched" the open viewer records: the Duncit group posts an official
 * status view, a followed person's story posts a story view, and everything
 * else (own story, club, sponsored) records nothing.
 */
export function pickSlideSeen(
  open: { official: boolean; person: boolean },
  record: { official: (slideId: string) => void; story: (slideId: string) => Promise<void> },
): ((slideId: string) => void) | undefined {
  if (open.official) return record.official;
  if (open.person) return record.story;
  return undefined;
}
