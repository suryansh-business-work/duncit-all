import { StatusTile } from '@/components/status/StatusTile';
import type { OfficialStory } from '@/components/status/officialStory';
import { useTranslation } from '@/hooks/useTranslation';

import { isGroupSeen } from './railOrder';

/** Duncit's own pinned tile, at the very head of the rail — before "Your story"
 * and before the sponsored tile. Renders nothing while no status is live, and
 * greys its ring through the rail's own seen rule, like every other tile.
 * Hoisted: a component defined inside another is remade on every render. */
export function OfficialStatusTile({
  story,
  seenIds,
  onPress,
}: Readonly<{ story: OfficialStory | null; seenIds: Set<string>; onPress: () => void }>) {
  const { t } = useTranslation();
  if (!story) return null;
  return (
    <StatusTile
      testID="status-official-tile"
      label={t('mweb.status.officialTile')}
      image={story.photo}
      seen={isGroupSeen(story, seenIds)}
      onPress={onPress}
    />
  );
}
