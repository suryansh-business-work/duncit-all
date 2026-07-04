import { Reveal } from '@/animations/Reveal';
import { FeedList } from '@/components/FeedList';
import { ClubCard } from '@/components/home/ClubCard';
import { TabScreen } from '@/components/TabScreen';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useHomeData } from '@/hooks/useHomeFeed';

/** Clubs tab — all active communities. */
export function ClubsScreen() {
  const { clubs, isLoading, refetch } = useHomeData();
  const { openClub } = useDetailNav();

  return (
    <TabScreen testID="clubs-screen">
      <FeedList
        testID="clubs-list"
        isLoading={isLoading}
        isEmpty={clubs.length === 0}
        emptyText="No clubs yet. Pull to refresh."
        onRefresh={refetch}
        data={clubs}
        keyExtractor={(club) => club.id}
        renderItem={(club, index) => (
          <Reveal index={index} scale>
            <ClubCard club={club} onPress={() => openClub(club.id, club.club_name)} />
          </Reveal>
        )}
      />
    </TabScreen>
  );
}
