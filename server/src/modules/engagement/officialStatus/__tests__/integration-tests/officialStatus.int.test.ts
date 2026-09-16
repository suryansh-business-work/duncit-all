import { Types } from 'mongoose';
import { officialStatusService } from '../../officialStatus.service';
import { officialStatusResolvers } from '../../officialStatus.resolver';
import { OfficialStatusModel, OfficialStatusSeenModel } from '../../officialStatus.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { UserModel } from '@modules/access/user/user.model';
import { makeContext } from '@test/harness';

const validInput = (over: Record<string, unknown> = {}) => ({
  title: 'Diwali Mega Sale',
  media_url: 'https://ik.imagekit.io/duncit/status1.jpg',
  media_type: 'IMAGE',
  caption: 'Up to 50% off',
  link_url: '/pod-ideas',
  scope: 'GLOBAL',
  location_ids: [] as string[],
  expiry: 'NEVER',
  custom_expires_at: null as string | null,
  is_active: true,
  ...over,
});

describe('officialStatusService', () => {
  describe('create — expiry', () => {
    it('NEVER never expires', async () => {
      const created = await officialStatusService.create(validInput({ expiry: 'NEVER' }) as any);
      expect(created.expires_at).toBeNull();
      expect(created.is_live).toBe(true);
    });

    it('HOURS_24 expires about a day from now', async () => {
      const created = await officialStatusService.create(validInput({ expiry: 'HOURS_24' }) as any);
      expect(created.expires_at).toBeTruthy();
      const expiresAt = new Date(created.expires_at as string).getTime();
      expect(expiresAt).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
      expect(expiresAt).toBeLessThan(Date.now() + 25 * 60 * 60 * 1000);
    });

    it('CUSTOM rejects a blank date', async () => {
      await expect(
        officialStatusService.create(
          validInput({ expiry: 'CUSTOM', custom_expires_at: '' }) as any
        )
      ).rejects.toThrow(/valid expiry date/i);
    });

    it('CUSTOM rejects an unparsable date', async () => {
      await expect(
        officialStatusService.create(
          validInput({ expiry: 'CUSTOM', custom_expires_at: 'not-a-date' }) as any
        )
      ).rejects.toThrow(/valid expiry date/i);
    });

    it('CUSTOM rejects a date already in the past', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      await expect(
        officialStatusService.create(
          validInput({ expiry: 'CUSTOM', custom_expires_at: past }) as any
        )
      ).rejects.toThrow(/must be in the future/i);
    });

    it('CUSTOM accepts a future date', async () => {
      const future = new Date(Date.now() + 3600_000).toISOString();
      const created = await officialStatusService.create(
        validInput({ expiry: 'CUSTOM', custom_expires_at: future }) as any
      );
      expect(created.expires_at).toBe(new Date(future).toISOString());
    });
  });

  describe('create — location scope', () => {
    it('rejects a LOCATION status whose ids are all invalid', async () => {
      await expect(
        officialStatusService.create(
          validInput({ scope: 'LOCATION', location_ids: ['not-an-id'] }) as any
        )
      ).rejects.toThrow(/pick at least one city/i);
    });

    it('rejects a LOCATION status pointing at a city that does not exist', async () => {
      const ghost = new Types.ObjectId().toString();
      await expect(
        officialStatusService.create(
          validInput({ scope: 'LOCATION', location_ids: [ghost] }) as any
        )
      ).rejects.toThrow(/no longer exists/i);
    });

    it('dedupes repeated city ids and stores each city once', async () => {
      const pune = await LocationModel.create({ location_id: 'pune', location_name: 'Pune' });
      const created = await officialStatusService.create(
        validInput({
          scope: 'LOCATION',
          location_ids: [String(pune._id), String(pune._id)],
        }) as any
      );
      expect(created.location_ids).toEqual([String(pune._id)]);
    });

    it('stores every chosen city for a LOCATION status', async () => {
      const pune = await LocationModel.create({ location_id: 'pune', location_name: 'Pune' });
      const mumbai = await LocationModel.create({ location_id: 'mumbai', location_name: 'Mumbai' });
      const created = await officialStatusService.create(
        validInput({
          scope: 'LOCATION',
          location_ids: [String(pune._id), String(mumbai._id)],
        }) as any
      );
      expect([...created.location_ids].sort()).toEqual(
        [String(pune._id), String(mumbai._id)].sort()
      );
    });

    it('drops the location list entirely when the scope is GLOBAL, even if ids were sent', async () => {
      const pune = await LocationModel.create({ location_id: 'pune', location_name: 'Pune' });
      const created = await officialStatusService.create(
        validInput({ scope: 'GLOBAL', location_ids: [String(pune._id)] }) as any
      );
      expect(created.location_ids).toEqual([]);
    });
  });

  it('rejects an invalid media_url before writing anything', async () => {
    await expect(
      officialStatusService.create(validInput({ media_url: 'not-a-url' }) as any)
    ).rejects.toThrow(/http\(s\) URL/i);
    expect(await OfficialStatusModel.countDocuments()).toBe(0);
  });

  describe('update', () => {
    it('rejects an invalid id', async () => {
      await expect(officialStatusService.update('bad-id', validInput() as any)).rejects.toThrow(
        /status not found/i
      );
    });

    it('rejects an id that does not exist', async () => {
      await expect(
        officialStatusService.update(new Types.ObjectId().toString(), validInput() as any)
      ).rejects.toThrow(/status not found/i);
    });

    it('updates an existing status', async () => {
      const created = await officialStatusService.create(validInput({ title: 'Original' }) as any);
      const updated = await officialStatusService.update(
        created.id,
        validInput({ title: 'Updated' }) as any
      );
      expect(updated.title).toBe('Updated');
      expect(updated.id).toBe(created.id);
    });
  });

  describe('remove', () => {
    it('rejects an invalid id', async () => {
      await expect(officialStatusService.remove('bad-id')).rejects.toThrow(/status not found/i);
    });

    it('rejects an id that does not exist', async () => {
      await expect(officialStatusService.remove(new Types.ObjectId().toString())).rejects.toThrow(
        /status not found/i
      );
    });

    it('deletes the status and cascades to its seen rows', async () => {
      const created = await officialStatusService.create(validInput() as any);
      const viewer = new Types.ObjectId().toString();
      await officialStatusService.markSeen(viewer, created.id);
      expect(
        await OfficialStatusSeenModel.countDocuments({ status_doc_id: created.id })
      ).toBe(1);

      expect(await officialStatusService.remove(created.id)).toBe(true);
      expect(await OfficialStatusModel.countDocuments()).toBe(0);
      expect(await OfficialStatusSeenModel.countDocuments()).toBe(0);
    });
  });

  describe('liveFor', () => {
    it('always includes a GLOBAL status, regardless of the viewer’s city', async () => {
      await officialStatusService.create(validInput({ title: 'Global promo' }) as any);
      const rail = await officialStatusService.liveFor();
      expect(rail.map((s) => s.title)).toEqual(['Global promo']);
    });

    it('only includes a LOCATION status for a matching city', async () => {
      const pune = await LocationModel.create({ location_id: 'pune', location_name: 'Pune' });
      await officialStatusService.create(
        validInput({ title: 'Pune only', scope: 'LOCATION', location_ids: [String(pune._id)] }) as any
      );
      expect(await officialStatusService.liveFor(String(pune._id))).toHaveLength(1);
      expect(await officialStatusService.liveFor()).toHaveLength(0);
      expect(await officialStatusService.liveFor(new Types.ObjectId().toString())).toHaveLength(0);
    });

    it('drops an expired status', async () => {
      const created = await officialStatusService.create(validInput() as any);
      await OfficialStatusModel.updateOne(
        { _id: created.id },
        { $set: { expires_at: new Date(Date.now() - 1000) } }
      );
      expect(await officialStatusService.liveFor()).toHaveLength(0);
    });

    it('drops an inactive status', async () => {
      await officialStatusService.create(validInput({ is_active: false }) as any);
      expect(await officialStatusService.liveFor()).toHaveLength(0);
    });

    it('flags seen_by_me only for a viewer who has watched it, and never for a signed-out one', async () => {
      const created = await officialStatusService.create(validInput() as any);
      const viewer = new Types.ObjectId().toString();
      await officialStatusService.markSeen(viewer, created.id);

      const forViewer = await officialStatusService.liveFor(null, viewer);
      expect(forViewer[0].seen_by_me).toBe(true);

      const forStranger = await officialStatusService.liveFor(null, new Types.ObjectId().toString());
      expect(forStranger[0].seen_by_me).toBe(false);

      const signedOut = await officialStatusService.liveFor(null, null);
      expect(signedOut[0].seen_by_me).toBe(false);

      const badViewerId = await officialStatusService.liveFor(null, 'not-an-id');
      expect(badViewerId[0].seen_by_me).toBe(false);
    });
  });

  describe('markSeen', () => {
    it('rejects an invalid status id', async () => {
      await expect(
        officialStatusService.markSeen(new Types.ObjectId().toString(), 'bad-id')
      ).rejects.toThrow(/status not found/i);
    });

    it('is idempotent — watching the same status twice writes one row', async () => {
      const created = await officialStatusService.create(validInput() as any);
      const viewer = new Types.ObjectId().toString();
      await officialStatusService.markSeen(viewer, created.id);
      await officialStatusService.markSeen(viewer, created.id);
      expect(
        await OfficialStatusSeenModel.countDocuments({ status_doc_id: created.id, user_id: viewer })
      ).toBe(1);
    });
  });

  describe('viewCount', () => {
    it('short-circuits to 0 for an invalid id, without touching the database', async () => {
      await expect(officialStatusService.viewCount('bad-id')).resolves.toBe(0);
    });

    it('counts every distinct viewer', async () => {
      const created = await officialStatusService.create(validInput() as any);
      await officialStatusService.markSeen(new Types.ObjectId().toString(), created.id);
      await officialStatusService.markSeen(new Types.ObjectId().toString(), created.id);
      expect(await officialStatusService.viewCount(created.id)).toBe(2);
    });
  });

  describe('locationNames', () => {
    it('returns an empty list when every id is invalid', async () => {
      expect(await officialStatusService.locationNames(['bad-id'])).toEqual([]);
    });

    it('returns the matching names, in input order, dropping a city that no longer exists', async () => {
      const pune = await LocationModel.create({ location_id: 'pune', location_name: 'Pune' });
      const mumbai = await LocationModel.create({ location_id: 'mumbai', location_name: 'Mumbai' });
      const ghost = new Types.ObjectId().toString();
      const names = await officialStatusService.locationNames([
        String(mumbai._id),
        ghost,
        String(pune._id),
      ]);
      expect(names).toEqual(['Mumbai', 'Pune']);
    });
  });

  describe('table', () => {
    it('lists every status, newest first, expired ones included', async () => {
      const first = await officialStatusService.create(validInput({ title: 'First' }) as any);
      await officialStatusService.create(validInput({ title: 'Second' }) as any);
      await OfficialStatusModel.updateOne(
        { _id: first.id },
        { $set: { expires_at: new Date(Date.now() - 1000) } }
      );
      const page = await officialStatusService.table();
      expect(page.total).toBe(2);
      expect(page.rows.map((r) => r.title)).toEqual(['Second', 'First']);
    });
  });
});

describe('officialStatus resolver — success paths', () => {
  const marketingCtx = () => makeContext({ roles: ['MARKETING_MANAGER'] });

  it('officialStatusesTable returns the full table for an authorized admin', async () => {
    await officialStatusService.create(validInput({ title: 'Table row' }) as any);
    const page = await (officialStatusResolvers.Query as any).officialStatusesTable(
      {},
      {},
      marketingCtx()
    );
    expect(page.total).toBe(1);
    expect(page.rows[0].title).toBe('Table row');
  });

  it('officialStatuses is open to a signed-out viewer', async () => {
    await officialStatusService.create(validInput({ title: 'Rail item' }) as any);
    const rail = await (officialStatusResolvers.Query as any).officialStatuses({}, {}, makeContext(null));
    expect(rail.map((s: any) => s.title)).toEqual(['Rail item']);
    expect(rail[0].seen_by_me).toBe(false);
  });

  it('createOfficialStatus validates the input, then creates via the service', async () => {
    const ctx = marketingCtx();
    const created = await (officialStatusResolvers.Mutation as any).createOfficialStatus(
      {},
      { input: validInput({ title: 'Created via resolver' }) },
      ctx
    );
    expect(created.title).toBe('Created via resolver');
    expect(created.created_by_id).toBe(ctx.user?.id);
  });

  it('createOfficialStatus rejects input that fails schema validation before hitting the service', async () => {
    await expect(
      (officialStatusResolvers.Mutation as any).createOfficialStatus(
        {},
        { input: validInput({ title: '' }) },
        marketingCtx()
      )
    ).rejects.toThrow(/validation failed/i);
    expect(await OfficialStatusModel.countDocuments()).toBe(0);
  });

  it('updateOfficialStatus validates then updates via the service', async () => {
    const created = await officialStatusService.create(validInput({ title: 'Before' }) as any);
    const updated = await (officialStatusResolvers.Mutation as any).updateOfficialStatus(
      {},
      { status_doc_id: created.id, input: validInput({ title: 'After' }) },
      marketingCtx()
    );
    expect(updated.title).toBe('After');
  });

  it('deleteOfficialStatus removes via the service', async () => {
    const created = await officialStatusService.create(validInput() as any);
    await expect(
      (officialStatusResolvers.Mutation as any).deleteOfficialStatus(
        {},
        { status_doc_id: created.id },
        marketingCtx()
      )
    ).resolves.toBe(true);
    expect(await OfficialStatusModel.countDocuments()).toBe(0);
  });

  it('recordOfficialStatusView marks the signed-in viewer as having seen it', async () => {
    const created = await officialStatusService.create(validInput() as any);
    const ctx = makeContext({});
    await expect(
      (officialStatusResolvers.Mutation as any).recordOfficialStatusView(
        {},
        { status_doc_id: created.id },
        ctx
      )
    ).resolves.toBe(true);
    expect(
      await OfficialStatusSeenModel.countDocuments({ user_id: ctx.user?.id, status_doc_id: created.id })
    ).toBe(1);
  });
});

describe('OfficialStatus field resolvers', () => {
  it('location_names resolves the chosen cities', async () => {
    const pune = await LocationModel.create({ location_id: 'pune', location_name: 'Pune' });
    const names = await officialStatusResolvers.OfficialStatus.location_names({
      location_ids: [String(pune._id)],
    });
    expect(names).toEqual(['Pune']);
  });

  it('view_count resolves the number of viewers', async () => {
    const created = await officialStatusService.create(validInput() as any);
    await officialStatusService.markSeen(new Types.ObjectId().toString(), created.id);
    const count = await officialStatusResolvers.OfficialStatus.view_count({ id: created.id });
    expect(count).toBe(1);
  });

  it('created_by resolves the display name of the creator, blank when there is none', async () => {
    const user = await UserModel.create({
      auth: { email: 'marketer@duncit.com' },
      profile: { first_name: 'Riya', last_name: 'Sharma' },
    });
    const withCreator = await officialStatusResolvers.OfficialStatus.created_by({
      created_by_id: String(user._id),
    });
    expect(withCreator).toBe('Riya Sharma');

    const withoutCreator = await officialStatusResolvers.OfficialStatus.created_by({});
    expect(withoutCreator).toBe('');
  });
});
