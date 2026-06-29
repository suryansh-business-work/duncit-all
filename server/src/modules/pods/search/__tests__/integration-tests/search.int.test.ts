import { Types } from 'mongoose';
import { searchService } from '../../search.service';
import { clubService } from '@modules/pods/club/club.service';
import { CategoryModel } from '@modules/pods/category/category.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubFollowerModel } from '@modules/access/user/relations';

const DAY_MS = 24 * 60 * 60 * 1000;

async function seedPod(clubId: string, whenMs: number, attendees: string[] = []) {
  await PodModel.collection.insertOne({
    _id: new Types.ObjectId(),
    pod_id: `pod-${whenMs}-${Math.round(whenMs % 1000)}`,
    pod_title: 'Friendly Match',
    pod_hosts_id: [new Types.ObjectId()],
    club_id: new Types.ObjectId(clubId),
    pod_attendees: attendees.map((id) => new Types.ObjectId(id)),
    pod_date_time: new Date(Date.now() + whenMs),
    pod_type: 'NATIVE_FREE',
    is_active: true,
  } as never);
}

describe('searchService integration', () => {
  it('groups clubs with next-7-day pods under happening and the rest under more_clubs', async () => {
    const soon = await clubService.create({ club_name: 'Badminton Club' });
    const later = await clubService.create({ club_name: 'Badminton Beginners' });
    await seedPod(soon!.id, 2 * DAY_MS);
    await seedPod(later!.id, 30 * DAY_MS); // outside the 7-day window

    const res = await searchService.discovery({ query: 'badminton' }, null);
    expect(res.happening.map((r) => r.club!.id)).toEqual([soon!.id]);
    expect(res.more_clubs.map((r) => r.club!.id)).toEqual([later!.id]);
    expect(res.happening[0].upcoming_pods).toHaveLength(1);
    expect(res.happening[0].next_pod_date).toBeTruthy();
  });

  it('sorts happening clubs by follower count first', async () => {
    const popular = await clubService.create({ club_name: 'Chess Popular' });
    const quiet = await clubService.create({ club_name: 'Chess Quiet' });
    await seedPod(popular!.id, DAY_MS);
    await seedPod(quiet!.id, DAY_MS);
    await ClubFollowerModel.create({ user_id: new Types.ObjectId(), club_id: new Types.ObjectId(popular!.id) });
    await ClubFollowerModel.create({ user_id: new Types.ObjectId(), club_id: new Types.ObjectId(popular!.id) });
    await ClubFollowerModel.create({ user_id: new Types.ObjectId(), club_id: new Types.ObjectId(quiet!.id) });

    const res = await searchService.discovery({ query: 'chess' }, null);
    expect(res.happening.map((r) => r.club!.club_name)).toEqual(['Chess Popular', 'Chess Quiet']);
  });

  it('sums attendees across upcoming pods into participant_count', async () => {
    const club = await clubService.create({ club_name: 'Football Crew' });
    await seedPod(club!.id, DAY_MS, [new Types.ObjectId().toString(), new Types.ObjectId().toString()]);
    await seedPod(club!.id, 2 * DAY_MS, [new Types.ObjectId().toString()]);

    const res = await searchService.discovery({ query: 'football' }, null);
    expect(res.happening[0].participant_count).toBe(3);
    expect(res.happening[0].upcoming_pods).toHaveLength(2);
  });

  it('matches clubs by their category name and by an explicit category filter', async () => {
    const catId = new Types.ObjectId();
    await CategoryModel.collection.insertOne({
      _id: catId,
      name: 'Racquet Sports',
      slug: 'racquet-sports',
      level: 'CATEGORY',
      is_active: true,
    } as never);
    const club = await clubService.create({ club_name: 'Smashers', category_id: catId.toString() });
    await seedPod(club!.id, DAY_MS);

    const byName = await searchService.discovery({ query: 'racquet' }, null);
    expect(byName.happening.map((r) => r.club!.id)).toEqual([club!.id]);

    const byFilter = await searchService.discovery({ category_id: catId.toString() }, null);
    expect(byFilter.happening.map((r) => r.club!.id)).toEqual([club!.id]);
  });

  it('reflects the viewer follow state and returns nothing without a query or category', async () => {
    const viewer = new Types.ObjectId();
    const club = await clubService.create({ club_name: 'Cycling Tribe' });
    await seedPod(club!.id, DAY_MS);
    await ClubFollowerModel.create({ user_id: viewer, club_id: new Types.ObjectId(club!.id) });

    const followed = await searchService.discovery({ query: 'cycling' }, viewer.toString());
    expect(followed.happening[0].is_following).toBe(true);

    const anon = await searchService.discovery({ query: 'cycling' }, null);
    expect(anon.happening[0].is_following).toBe(false);

    const empty = await searchService.discovery({}, null);
    expect(empty.happening).toEqual([]);
    expect(empty.more_clubs).toEqual([]);
  });

  it('returns ranked, de-duplicated suggestions and nothing for a blank query', async () => {
    await clubService.create({ club_name: 'Badminton Club' });
    await CategoryModel.collection.insertOne({
      _id: new Types.ObjectId(),
      name: 'Badminton',
      slug: 'badminton',
      level: 'SUB',
      is_active: true,
    } as never);

    const suggestions = await searchService.suggestions('bad', 5);
    const texts = suggestions.map((s) => s.text);
    expect(texts).toContain('Badminton');
    expect(texts).toContain('Badminton Club');
    // Exact-ish prefix match ranks ahead of the longer club name.
    expect(texts.indexOf('Badminton')).toBeLessThan(texts.indexOf('Badminton Club'));
    expect(await searchService.suggestions('  ', 5)).toEqual([]);
  });
});
