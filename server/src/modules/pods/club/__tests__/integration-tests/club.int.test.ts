import { Types } from 'mongoose';
import { clubService } from '../../club.service';
import { ClubModel } from '../../club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { ClubFollowerModel } from '@modules/access/user/relations';

describe('clubService integration', () => {
  it('creates a club, deriving a slug, and reads it back by id and slug', async () => {
    const created = await clubService.create({ club_name: 'Sunset Runners' });
    expect(created!.club_id).toBe('sunset-runners');

    expect((await clubService.getById(created!.id))?.club_name).toBe('Sunset Runners');
    expect((await clubService.getBySlug('sunset-runners'))?.id).toBe(created!.id);
  });

  it('prevents duplicate clubs by name/slug', async () => {
    await clubService.create({ club_name: 'Book Club' });
    await expect(clubService.create({ club_name: 'Book Club' })).rejects.toThrow(/already exists/i);
  });

  it('lists with filters, updates and removes', async () => {
    const c = await clubService.create({ club_name: 'Chess Circle' });
    expect(await clubService.list({ search: 'chess' })).toHaveLength(1);

    const updated = await clubService.update(c!.id, { club_description: 'Weekly chess', is_active: false });
    expect(updated!.club_description).toBe('Weekly chess');
    expect(updated!.is_active).toBe(false);

    expect(await clubService.remove(c!.id)).toBe(true);
    expect(await ClubModel.countDocuments()).toBe(0);
  });

  it('persists linked host_ids on create and update (Bug 5)', async () => {
    const h1 = new Types.ObjectId().toString();
    const created = await clubService.create({ club_name: 'Cyclists', host_ids: [h1] });
    expect(created!.host_ids).toEqual([h1]);

    const h2 = new Types.ObjectId().toString();
    const updated = await clubService.update(created!.id, { host_ids: [h2] });
    expect(updated!.host_ids).toEqual([h2]);
  });

  it('persists Club Detail page content (who_we_are/what_we_do/perks/values/faqs)', async () => {
    const created = await clubService.create({
      club_name: 'Makers',
      who_we_are: ['Builders', 'Tinkerers'],
      what_we_do: ['Weekly hack nights'],
      perks: ['Free coffee'],
      values: ['Curiosity'],
      faqs: [{ question: 'Cost?', answer: 'Free' }],
    });
    expect(created!.who_we_are).toEqual(['Builders', 'Tinkerers']);
    expect(created!.what_we_do).toEqual(['Weekly hack nights']);
    expect(created!.perks).toEqual(['Free coffee']);
    expect(created!.values).toEqual(['Curiosity']);
    expect(created!.faqs).toEqual([{ question: 'Cost?', answer: 'Free' }]);

    const updated = await clubService.update(created!.id, {
      perks: ['Free coffee', 'Member discounts'],
      faqs: [{ question: 'Age limit?', answer: '18+' }],
    });
    expect(updated!.perks).toEqual(['Free coffee', 'Member discounts']);
    expect(updated!.faqs).toEqual([{ question: 'Age limit?', answer: '18+' }]);
  });

  it('sets and toggles the verified badge (explore item 15)', async () => {
    const created = await clubService.create({ club_name: 'Official Club', is_verified: true });
    expect(created!.is_verified).toBe(true);

    const plain = await clubService.create({ club_name: 'Plain Club' });
    expect(plain!.is_verified).toBe(false);

    const updated = await clubService.update(plain!.id, { is_verified: true });
    expect(updated!.is_verified).toBe(true);
  });

  it('filters the club list by the verified badge (explore item 15)', async () => {
    await clubService.create({ club_name: 'Verified A', is_verified: true });
    await clubService.create({ club_name: 'Unverified B' });

    const verifiedOnly = await clubService.list({ is_verified: true });
    expect(verifiedOnly.map((c) => c.club_name)).toEqual(['Verified A']);

    const unverifiedOnly = await clubService.list({ is_verified: false });
    expect(unverifiedOnly.map((c) => c.club_name)).toEqual(['Unverified B']);

    const all = await clubService.list();
    expect(all.length).toBe(2);
  });

  it('resolves linked hosts, falls back to pod hosts, and counts followers (Bug 5)', async () => {
    const club = await clubService.create({ club_name: 'Trekkers' });
    const linked = new Types.ObjectId();
    const podHost = new Types.ObjectId();
    await UserModel.collection.insertOne({ _id: linked, profile: { first_name: 'Lin', last_name: 'Ked' } } as never);
    await UserModel.collection.insertOne({ _id: podHost, profile: { first_name: 'Pod', last_name: 'Host' } } as never);
    await PodModel.collection.insertOne({
      _id: new Types.ObjectId(),
      pod_id: 'p-trek',
      club_id: new Types.ObjectId(club!.id),
      pod_hosts_id: [podHost],
    } as never);

    // No linked hosts → fall back to the club's pods' hosts.
    const fallback = await clubService.getHosts(club!.id, []);
    expect(fallback.map((h) => h.id)).toEqual([String(podHost)]);

    // Linked hosts take precedence.
    const linkedHosts = await clubService.getHosts(club!.id, [String(linked)]);
    expect(linkedHosts.map((h) => h.id)).toEqual([String(linked)]);
    expect(linkedHosts[0].name).toBe('Lin Ked');

    expect(await clubService.followersCount(club!.id)).toBe(0);
    await ClubFollowerModel.create({ user_id: new Types.ObjectId(), club_id: new Types.ObjectId(club!.id) });
    expect(await clubService.followersCount(club!.id)).toBe(1);
  });
});
