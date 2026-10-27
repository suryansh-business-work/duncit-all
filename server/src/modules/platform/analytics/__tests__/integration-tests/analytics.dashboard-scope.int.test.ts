import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { ContactSubmissionModel } from '@modules/crm/contact/contact.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { analyticsResolvers } from '../../analytics.resolver';
import { analyticsService } from '../../analytics.service';

/**
 * The admin dashboard's totals, against a real database: a CITY_ADMIN counts
 * only their own city, a SUPER_ADMIN still counts the platform, and support
 * messages — which belong to no city — are never leaked to a city admin.
 */

const { dashboardTotals } = analyticsResolvers.Query;

type Totals = Awaited<ReturnType<typeof analyticsService.dashboardTotals>>;

const read = (ctx: ReturnType<typeof makeContext>) => dashboardTotals(null, {}, ctx) as Promise<Totals>;

const admin = (roles: string[], extra: { assigned_city?: string } = {}) =>
  makeContext({ id: new Types.ObjectId().toHexString(), roles: ['USER', ...roles], ...extra });

const location = (name: string) =>
  LocationModel.create({
    location_id: name.toLowerCase(),
    location_name: name,
    country: 'India',
    country_code: 'IN',
    city: name,
    location_image: `https://img/${name}.jpg`,
    location_pincode: '411001',
  });

/** One member, host, club, pod and venue in `city`. */
async function seedCity(city: string, locationId: Types.ObjectId, tag: string) {
  const user = await UserModel.create({ auth: { email: `${tag}@example.com` }, profile: { first_name: 'Member', city } });
  await HostModel.create({ user_id: user._id, status: 'APPROVED' });
  const club = await ClubModel.create({ club_id: `club-${tag}`, club_name: `Club ${tag}`, location_id: locationId });
  await PodModel.create({
    pod_id: `pod-${tag}`,
    pod_title: 'Pod',
    club_id: club._id,
    location_id: locationId,
    pod_description: 'desc',
    pod_type: 'FREE',
    pod_date_time: new Date(Date.now() + 86_400_000),
    is_active: true,
  });
  await VenueModel.create({ owner_user_id: user._id, venue_name: `Venue ${tag}`, location_id: locationId, city });
}

beforeEach(async () => {
  const pune = await location('Pune');
  const delhi = await location('Delhi');
  await seedCity('Pune', pune._id, 'pune-1');
  await seedCity('Delhi', delhi._id, 'delhi-1');
  await seedCity('Delhi', delhi._id, 'delhi-2');
  await ContactSubmissionModel.create({ name: 'Visitor', email: 'visitor@example.com', message: 'Hello' });
});

describe('dashboardTotals place scope', () => {
  it('counts only the CITY_ADMIN city for every entity, and no support messages', async () => {
    const totals = await read(admin(['CITY_ADMIN'], { assigned_city: 'Pune' }));
    expect(totals).toMatchObject({
      users_total: 1,
      hosts_total: 1,
      clubs_total: 1,
      pods_total: 1,
      venues_total: 1,
      support_tickets_open: 0,
      support_tickets_total: 0,
    });
    expect(totals.support_tickets_by_status.every((row) => row.count === 0)).toBe(true);
  });

  it('resolves a city assigned by its Location slug to the same place', async () => {
    const totals = await read(admin(['CITY_ADMIN'], { assigned_city: 'delhi' }));
    expect(totals).toMatchObject({ clubs_total: 2, pods_total: 2, venues_total: 2 });
  });

  it('refuses a CITY_ADMIN with no city assigned instead of showing the platform', async () => {
    // The scope check refuses before any count is started, so the resolver throws rather than rejects.
    await expect(async () => read(admin(['CITY_ADMIN']))).rejects.toMatchObject({
      message: 'Out of city scope',
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('leaves SUPER_ADMIN with the platform totals', async () => {
    const totals = await read(admin(['SUPER_ADMIN', 'CITY_ADMIN'], { assigned_city: 'Pune' }));
    expect(totals).toMatchObject({
      users_total: 3,
      hosts_total: 3,
      clubs_total: 3,
      pods_total: 3,
      venues_total: 3,
      support_tickets_total: 1,
      support_tickets_open: 1,
    });
  });
});
