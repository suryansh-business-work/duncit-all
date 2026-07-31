import { Types } from 'mongoose';
import { hostService } from '../../host.service';
import { hostResolvers } from '../../host.resolver';
import { CategoryModel } from '@modules/pods/category/category.model';
import { MeetingModel } from '@modules/survey/meeting.model';

/** Seed a Super → Category → Sub chain; returns the three ids as strings. */
async function seedCategoryTree(prefix: string) {
  const superCat = await CategoryModel.create({ name: `${prefix} Super`, slug: `${prefix}-super`, level: 'SUPER', parent_id: null });
  const category = await CategoryModel.create({ name: `${prefix} Cat`, slug: `${prefix}-cat`, level: 'CATEGORY', parent_id: superCat._id });
  const sub = await CategoryModel.create({ name: `${prefix} Sub`, slug: `${prefix}-sub`, level: 'SUB', parent_id: category._id });
  return {
    super_category_id: String(superCat._id),
    category_id: String(category._id),
    sub_category_id: String(sub._id),
  };
}

const seedMeeting = (userId: string, over: Record<string, unknown> = {}) =>
  MeetingModel.create({
    kind: 'HOST',
    user_id: new Types.ObjectId(userId),
    requested_at: new Date(),
    request_no: 'DUN-HOST-000001',
    ...over,
  });

/**
 * The category an applicant picked in the Earn with Duncit gate is copied onto
 * the host only when their meeting is approved. Everyone onboarded before that
 * seeding existed — plus partial triples and hosts created outside the meeting
 * flow — reaches review with an empty list, which is what this field exists to
 * repair.
 */
describe('Host.survey_category', () => {
  it('resolves the applicants latest complete triple, denormalized, with its meeting linkage', async () => {
    const userId = new Types.ObjectId().toString();
    const older = await seedCategoryTree('older');
    const latest = await seedCategoryTree('latest');
    await seedMeeting(userId, {
      ...Object.fromEntries(Object.entries(older).map(([k, v]) => [k, new Types.ObjectId(v)])),
      created_at: new Date('2026-01-01'),
    });
    await seedMeeting(userId, {
      super_category_id: new Types.ObjectId(latest.super_category_id),
      category_id: new Types.ObjectId(latest.category_id),
      sub_category_id: new Types.ObjectId(latest.sub_category_id),
      request_no: 'DUN-HOST-000002',
      created_at: new Date('2026-06-01'),
    });

    const resolved = await (hostResolvers.Host as any).survey_category({ user_id: userId });
    expect(resolved).toEqual({
      ...latest,
      super_category_name: 'latest Super',
      category_name: 'latest Cat',
      sub_category_name: 'latest Sub',
      request_no: 'DUN-HOST-000002',
    });
  });

  it('is null when the applicant never booked a meeting', async () => {
    expect(await hostService.surveyCategoryForUser(new Types.ObjectId().toString())).toBeNull();
  });

  it('is null for a meeting whose cascade was never completed', async () => {
    const userId = new Types.ObjectId().toString();
    const tree = await seedCategoryTree('partial');
    await seedMeeting(userId, {
      super_category_id: new Types.ObjectId(tree.super_category_id),
      category_id: new Types.ObjectId(tree.category_id),
      // No sub — CategoryStep only demands a level that has options.
    });
    expect(await hostService.surveyCategoryForUser(userId)).toBeNull();
  });

  // A stale triple must not be offered: adminSetHostCategories would reject it,
  // so surfacing it would only produce a broken "Add" button.
  it('is null when the taxonomy moved under the applicant since they applied', async () => {
    const userId = new Types.ObjectId().toString();
    const tree = await seedCategoryTree('stale');
    await seedMeeting(userId, {
      super_category_id: new Types.ObjectId(tree.super_category_id),
      category_id: new Types.ObjectId(tree.category_id),
      sub_category_id: new Types.ObjectId(tree.sub_category_id),
    });
    await CategoryModel.deleteOne({ _id: tree.category_id });

    expect(await hostService.surveyCategoryForUser(userId)).toBeNull();
  });

  it('is null for a malformed user id rather than throwing', async () => {
    expect(await hostService.surveyCategoryForUser('not-an-object-id')).toBeNull();
  });
});
