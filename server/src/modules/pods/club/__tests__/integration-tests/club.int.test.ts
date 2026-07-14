import { Types } from 'mongoose';
import { clubService } from '../../club.service';
import { ClubModel } from '../../club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueService } from '@modules/venues/venue/venue.service';
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

  it('serves the clubsTable page with search, filters, sort and paging', async () => {
    await clubService.create({ club_name: 'Alpha Runners', locality: 'Saket' });
    await clubService.create({ club_name: 'Beta Bakers', locality: 'Rohini' });
    await clubService.create({ club_name: 'Gamma Gamers', locality: 'Saket', is_active: false });

    // Plain envelope with the default sort (club_name asc) and clamp defaults.
    const all = await clubService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((c) => c!.club_name)).toEqual([
      'Alpha Runners',
      'Beta Bakers',
      'Gamma Gamers',
    ]);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans club_name, club_id and locality.
    const byName = await clubService.table({ search: 'gamers' });
    expect(byName.rows.map((c) => c!.club_name)).toEqual(['Gamma Gamers']);
    expect(byName.total).toBe(1);
    const byLocality = await clubService.table({ search: 'rohini' });
    expect(byLocality.rows.map((c) => c!.club_name)).toEqual(['Beta Bakers']);

    // Boolean + string filters narrow.
    const active = await clubService.table({ filters: [{ field: 'is_active', op: 'is_true' }] });
    expect(active.rows.map((c) => c!.club_name)).toEqual(['Alpha Runners', 'Beta Bakers']);
    const saket = await clubService.table({
      filters: [{ field: 'locality', op: 'eq', value: 'Saket' }],
    });
    expect(saket.total).toBe(2);

    // Allowlisted sort, both directions.
    const desc = await clubService.table({ sort_by: 'club_name', sort_dir: 'desc' });
    expect(desc.rows.map((c) => c!.club_name)).toEqual([
      'Gamma Gamers',
      'Beta Bakers',
      'Alpha Runners',
    ]);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await clubService.table({ page: 2, page_size: 1 });
    expect(page2.rows.map((c) => c!.club_name)).toEqual(['Beta Bakers']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
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

  it('persists location_id on create and update, coercing empty to null', async () => {
    const loc = new Types.ObjectId().toString();
    const created = await clubService.create({ club_name: 'Located Club', location_id: loc });
    expect(created!.location_id).toBe(loc);

    const cleared = await clubService.update(created!.id, { location_id: '' });
    expect(cleared!.location_id).toBeNull();

    const loc2 = new Types.ObjectId().toString();
    const reset = await clubService.update(created!.id, { location_id: loc2 });
    expect(reset!.location_id).toBe(loc2);
  });

  it('filters the club list by locality/zone within a city (Home > Clubs area filter)', async () => {
    const loc = new Types.ObjectId().toString();
    await clubService.create({ club_name: 'Saket Club', location_id: loc, locality: 'Saket' });
    await clubService.create({ club_name: 'Rohini Club', location_id: loc, locality: 'Rohini' });

    const saket = await clubService.list({ location_id: loc, locality: 'Saket' });
    expect(saket.map((c) => c.club_name)).toEqual(['Saket Club']);

    // A locality with no clubs returns nothing (drives the "No Clubs operating…" state).
    const none = await clubService.list({ location_id: loc, locality: 'Dwarka' });
    expect(none).toHaveLength(0);

    // Without a locality, every club in the city is returned.
    const all = await clubService.list({ location_id: loc });
    expect(all).toHaveLength(2);
  });

  it('counts active clubs by their own location_id', async () => {
    const locA = new Types.ObjectId().toString();
    const locB = new Types.ObjectId().toString();
    await clubService.create({ club_name: 'A One', location_id: locA });
    await clubService.create({ club_name: 'A Two', location_id: locA });
    await clubService.create({ club_name: 'B One', location_id: locB });
    // Inactive club → excluded.
    const inactive = await clubService.create({ club_name: 'Inactive', location_id: locA });
    await clubService.update(inactive!.id, { is_active: false });
    // Club with no location → contributes to no city.
    await clubService.create({ club_name: 'Locationless' });

    const counts = await clubService.activeClubCountsByLocation();
    expect(counts[locA]).toBe(2);
    expect(counts[locB]).toBe(1);
  });

  it('auto-matches APPROVED+active venues to a club by location + Super/Sub category', async () => {
    const locA = new Types.ObjectId();
    const locB = new Types.ObjectId();
    const superId = new Types.ObjectId();
    const subMatch = new Types.ObjectId();
    const subOther = new Types.ObjectId();

    const venMatch = new Types.ObjectId();
    const venWrongLoc = new Types.ObjectId();
    const venWrongSub = new Types.ObjectId();
    const venNotApproved = new Types.ObjectId();
    const venInactive = new Types.ObjectId();
    await VenueModel.collection.insertMany([
      // The one true match: right location, right super + sub.
      { _id: venMatch, venue_name: 'Match Hall', location_id: locA, status: 'APPROVED', is_active: true,
        venue_category: { super_category_id: superId, sub_category_id: subMatch } },
      // Right category, wrong city.
      { _id: venWrongLoc, venue_name: 'Wrong City', location_id: locB, status: 'APPROVED', is_active: true,
        venue_category: { super_category_id: superId, sub_category_id: subMatch } },
      // Right city + super, wrong sub.
      { _id: venWrongSub, venue_name: 'Wrong Sub', location_id: locA, status: 'APPROVED', is_active: true,
        venue_category: { super_category_id: superId, sub_category_id: subOther } },
      // Right everything but not approved.
      { _id: venNotApproved, venue_name: 'Draft', location_id: locA, status: 'DRAFT', is_active: true,
        venue_category: { super_category_id: superId, sub_category_id: subMatch } },
      // Right everything but deactivated.
      { _id: venInactive, venue_name: 'Dead', location_id: locA, status: 'APPROVED', is_active: false,
        venue_category: { super_category_id: superId, sub_category_id: subMatch } },
    ] as never);

    const club = await clubService.create({
      club_name: 'Matcher',
      location_id: String(locA),
      super_category_id: String(superId),
      category_id: String(subMatch),
    });

    const criteria = {
      location_id: club!.location_id,
      super_category_id: club!.super_category_id,
      category_id: club!.category_id,
    };
    const matched = await venueService.findMatchingForClub(criteria);
    expect(matched.map((v) => v.venue_name)).toEqual(['Match Hall']);
    expect(await venueService.countMatchingForClub(criteria)).toBe(1);

    // A club with no location matches nothing.
    expect(await venueService.findMatchingForClub({ location_id: null })).toEqual([]);
    expect(await venueService.countMatchingForClub({ location_id: null })).toBe(0);
  });
});
