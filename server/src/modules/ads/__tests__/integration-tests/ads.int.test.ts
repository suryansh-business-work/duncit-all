import { Types } from 'mongoose';
import { adsService, deriveAdStatus } from '../../ads.service';
import { AdPricingModel, AdRequestModel, nextAdTraceId } from '../../ads.model';

const DAY = 86_400_000;
const tomorrow = () => new Date(Date.now() + DAY);

const makeSubmission = (over: Record<string, unknown> = {}) => ({
  ad_title: 'Summer sale',
  ad_description: 'Half price pods all week',
  ad_type: 'IMAGE',
  media_url: 'https://cdn.example.com/ad.jpg',
  position: 'SIDEBAR',
  start_at: tomorrow().toISOString(),
  duration_days: 3,
  ...over,
});

// Rows created straight on the model (bypassing submit) so activeAds windows
// can sit in the past/future, which submit's validation would refuse.
let traceSeq = 0;
const makeAdDoc = (over: Record<string, unknown> = {}) => ({
  trace_id: `AD-9${String(++traceSeq).padStart(5, '0')}`,
  ad_title: 'Served ad',
  ad_description: 'desc',
  ad_type: 'IMAGE',
  media_url: 'https://cdn.example.com/live.jpg',
  position: 'SIDEBAR',
  start_at: new Date(Date.now() - DAY),
  duration_days: 2,
  end_at: new Date(Date.now() + DAY),
  status: 'APPROVED',
  estimated_cost: 1000,
  submitted_by: new Types.ObjectId(),
  ...over,
});

describe('ads integration', () => {
  describe('trace ids', () => {
    it('issues sequential human-readable trace ids', async () => {
      expect(await nextAdTraceId()).toBe('AD-000001');
      expect(await nextAdTraceId()).toBe('AD-000002');
      expect(await nextAdTraceId()).toBe('AD-000003');
    });
  });

  describe('submit', () => {
    it('quotes the cost, derives end_at and stores a PENDING request', async () => {
      const userId = String(new Types.ObjectId());
      const start = tomorrow();
      const ad = await adsService.submit(userId, makeSubmission({ start_at: start.toISOString() }));

      expect(ad.trace_id).toBe('AD-000001');
      expect(ad.status).toBe('PENDING');
      // Default pricing is 500/day per position → 3 days = 1500.
      expect(ad.estimated_cost).toBe(1500);
      expect(ad.currency_symbol).toBe('₹');
      expect(ad.start_at).toBe(start.toISOString());
      expect(ad.end_at).toBe(new Date(start.getTime() + 3 * DAY).toISOString());
      expect(ad.redirect_url).toBeNull();
      expect(ad.approved_cost).toBeNull();
      expect(ad.submitted_by).toBe(userId);
    });

    it('rejects an unknown position', async () => {
      await expect(
        adsService.submit(String(new Types.ObjectId()), makeSubmission({ position: 'FOOTER' }))
      ).rejects.toMatchObject({
        message: 'Unknown ad position',
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });

    it('rejects media that is not a hosted URL', async () => {
      await expect(
        adsService.submit(
          String(new Types.ObjectId()),
          makeSubmission({ media_url: 'ftp://cdn.example.com/ad.jpg' })
        )
      ).rejects.toMatchObject({
        message: 'Ad media must be uploaded before submitting',
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });

    it('rejects a start date in the past', async () => {
      await expect(
        adsService.submit(
          String(new Types.ObjectId()),
          makeSubmission({ start_at: new Date(Date.now() - 2 * DAY).toISOString() })
        )
      ).rejects.toMatchObject({
        message: 'Start date cannot be in the past',
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });

    it('rejects durations outside 1..30 days', async () => {
      const expected = {
        message: 'Duration must be between 1 day and 1 month',
        extensions: { code: 'BAD_USER_INPUT' },
      };
      await expect(
        adsService.submit(String(new Types.ObjectId()), makeSubmission({ duration_days: 0 }))
      ).rejects.toMatchObject(expected);
      await expect(
        adsService.submit(String(new Types.ObjectId()), makeSubmission({ duration_days: 31 }))
      ).rejects.toMatchObject(expected);
    });

    it('rejects a malformed redirect URL', async () => {
      await expect(
        adsService.submit(
          String(new Types.ObjectId()),
          makeSubmission({ redirect_url: 'www.example.com/promo' })
        )
      ).rejects.toMatchObject({
        message: 'Redirect URL must start with http(s)://',
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });
  });

  describe('pricing', () => {
    it('creates the singleton with defaults on first read and reuses it after', async () => {
      const pricing = await adsService.pricing();
      expect(pricing).toEqual({
        auto_per_day: 500,
        home_bottom_per_day: 500,
        sidebar_per_day: 500,
        explore_scroll_per_day: 500,
        status_per_day: 500,
        venue_list_per_day: 500,
        club_list_per_day: 500,
        pod_list_per_day: 500,
        pod_details_per_day: 500,
        currency_symbol: '₹',
      });
      await adsService.pricing();
      expect(await AdPricingModel.countDocuments()).toBe(1);
    });

    it('updates only the provided fields and leaves the rest untouched', async () => {
      const updated = await adsService.updatePricing({ sidebar_per_day: 750, currency_symbol: '$' });
      expect(updated.sidebar_per_day).toBe(750);
      expect(updated.currency_symbol).toBe('$');
      expect(updated.home_bottom_per_day).toBe(500);

      // null values are "not provided", never zeroed.
      const again = await adsService.updatePricing({ pod_list_per_day: 20, sidebar_per_day: null });
      expect(again.pod_list_per_day).toBe(20);
      expect(again.sidebar_per_day).toBe(750);
      expect(again.currency_symbol).toBe('$');
    });

    it('rejects a negative price', async () => {
      await expect(adsService.updatePricing({ sidebar_per_day: -1 })).rejects.toMatchObject({
        message: 'Invalid price for sidebar_per_day',
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });

    it('rejects an empty currency symbol', async () => {
      await expect(adsService.updatePricing({ currency_symbol: '   ' })).rejects.toMatchObject({
        message: 'Currency symbol is required',
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });
  });

  describe('review', () => {
    it('approve freezes approved_cost from the pricing at approval time', async () => {
      const owner = String(new Types.ObjectId());
      const reviewer = String(new Types.ObjectId());
      // Quoted at the default 500/day × 2 days = 1000.
      const ad = await adsService.submit(owner, makeSubmission({ duration_days: 2 }));
      expect(ad.estimated_cost).toBe(1000);

      // Pricing changes between submission and approval → the bill uses CURRENT pricing.
      await adsService.updatePricing({ sidebar_per_day: 800 });
      const approved = await adsService.review(reviewer, ad.id, true);
      expect(approved.status).toBe('APPROVED');
      expect(approved.approved_cost).toBe(1600);
      expect(approved.estimated_cost).toBe(1000);
      expect(approved.reviewed_at).not.toBeNull();

      // …and later pricing edits never move the frozen bill.
      await adsService.updatePricing({ sidebar_per_day: 999 });
      const reread = await adsService.byId(ad.id, { id: reviewer, canReview: true });
      expect(reread.approved_cost).toBe(1600);
    });

    it('reject stores the remarks and never sets approved_cost', async () => {
      const ad = await adsService.submit(String(new Types.ObjectId()), makeSubmission());
      const rejected = await adsService.review(
        String(new Types.ObjectId()),
        ad.id,
        false,
        '  Not brand safe  '
      );
      expect(rejected.status).toBe('REJECTED');
      expect(rejected.marketing_remarks).toBe('Not brand safe');
      expect(rejected.approved_cost).toBeNull();
      expect(rejected.reviewed_at).not.toBeNull();
    });

    it('only PENDING requests can be reviewed', async () => {
      const reviewer = String(new Types.ObjectId());
      const ad = await adsService.submit(String(new Types.ObjectId()), makeSubmission());
      await adsService.review(reviewer, ad.id, true);
      await expect(adsService.review(reviewer, ad.id, false)).rejects.toMatchObject({
        message: 'Only pending requests can be reviewed',
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });
  });

  describe('deriveAdStatus', () => {
    it('passes PENDING/REJECTED through and windows APPROVED into APPROVED/LIVE/EXPIRED', () => {
      const now = new Date('2026-07-16T12:00:00Z');
      const before = { start_at: new Date('2026-07-17T00:00:00Z'), end_at: new Date('2026-07-20T00:00:00Z') };
      const inside = { start_at: new Date('2026-07-15T00:00:00Z'), end_at: new Date('2026-07-20T00:00:00Z') };
      const past = { start_at: new Date('2026-07-10T00:00:00Z'), end_at: new Date('2026-07-12T00:00:00Z') };

      expect(deriveAdStatus({ status: 'PENDING', ...inside }, now)).toBe('PENDING');
      expect(deriveAdStatus({ status: 'REJECTED', ...inside }, now)).toBe('REJECTED');
      expect(deriveAdStatus({ status: 'APPROVED', ...before }, now)).toBe('APPROVED');
      expect(deriveAdStatus({ status: 'APPROVED', ...inside }, now)).toBe('LIVE');
      expect(deriveAdStatus({ status: 'APPROVED', ...past }, now)).toBe('EXPIRED');
    });

    it('the derived LIVE/EXPIRED status flows through reads', async () => {
      const reviewer = { id: String(new Types.ObjectId()), canReview: true };
      const ad = await adsService.submit(String(new Types.ObjectId()), makeSubmission());
      await adsService.review(reviewer.id, ad.id, true);

      await AdRequestModel.updateOne(
        { _id: ad.id },
        { start_at: new Date(Date.now() - DAY), end_at: new Date(Date.now() + DAY) }
      );
      expect((await adsService.byId(ad.id, reviewer)).status).toBe('LIVE');

      await AdRequestModel.updateOne(
        { _id: ad.id },
        { start_at: new Date(Date.now() - 3 * DAY), end_at: new Date(Date.now() - DAY) }
      );
      expect((await adsService.byId(ad.id, reviewer)).status).toBe('EXPIRED');
    });
  });

  describe('activeAds', () => {
    it('serves live APPROVED ads for the position, AUTO ads everywhere', async () => {
      const sidebar = await AdRequestModel.create(makeAdDoc());
      const auto = await AdRequestModel.create(makeAdDoc({ position: 'AUTO' }));
      await AdRequestModel.create(makeAdDoc({ position: 'HOME_BOTTOM' }));

      const served = await adsService.activeAds('SIDEBAR');
      expect(served.map((a) => a.id).sort()).toEqual([String(sidebar._id), String(auto._id)].sort());

      // The AUTO placement itself serves only AUTO ads.
      const autoOnly = await adsService.activeAds('AUTO');
      expect(autoOnly.map((a) => a.id)).toEqual([String(auto._id)]);
    });

    it('excludes pending, rejected, expired and not-yet-started ads', async () => {
      const live = await AdRequestModel.create(makeAdDoc());
      await AdRequestModel.create(makeAdDoc({ status: 'PENDING' }));
      await AdRequestModel.create(makeAdDoc({ status: 'REJECTED' }));
      await AdRequestModel.create(
        makeAdDoc({ start_at: new Date(Date.now() - 3 * DAY), end_at: new Date(Date.now() - DAY) })
      );
      await AdRequestModel.create(
        makeAdDoc({ start_at: new Date(Date.now() + DAY), end_at: new Date(Date.now() + 3 * DAY) })
      );

      const served = await adsService.activeAds('SIDEBAR');
      expect(served.map((a) => a.id)).toEqual([String(live._id)]);
    });

    it('returns only the lean public shape', async () => {
      const doc = await AdRequestModel.create(
        makeAdDoc({ redirect_url: 'https://example.com/promo' })
      );
      const [ad] = await adsService.activeAds('SIDEBAR');
      // toEqual is exact: internal fields (costs, submitter, status) must not leak.
      expect(ad).toEqual({
        id: String(doc._id),
        ad_type: 'IMAGE',
        media_url: 'https://cdn.example.com/live.jpg',
        redirect_url: 'https://example.com/promo',
        ad_title: 'Served ad',
        position: 'SIDEBAR',
      });
    });
  });

  describe('tables', () => {
    it('myTable is scoped to the caller; table sees every request', async () => {
      const alice = String(new Types.ObjectId());
      const bob = String(new Types.ObjectId());
      await adsService.submit(alice, makeSubmission({ ad_title: 'Alice A' }));
      await adsService.submit(alice, makeSubmission({ ad_title: 'Alice B' }));
      await adsService.submit(bob, makeSubmission({ ad_title: 'Bob A' }));

      const mine = await adsService.myTable(alice);
      expect(mine.total).toBe(2);
      expect(mine.rows.map((r) => r.submitted_by)).toEqual([alice, alice]);
      expect(mine.rows.map((r) => r.ad_title).sort()).toEqual(['Alice A', 'Alice B']);

      const all = await adsService.table();
      expect(all.total).toBe(3);
      expect(all.rows.map((r) => r.ad_title).sort()).toEqual(['Alice A', 'Alice B', 'Bob A']);
    });
  });

  describe('byId', () => {
    it('allows the owner and reviewers, forbids strangers', async () => {
      const owner = String(new Types.ObjectId());
      const ad = await adsService.submit(owner, makeSubmission());

      const own = await adsService.byId(ad.id, { id: owner, canReview: false });
      expect(own.trace_id).toBe(ad.trace_id);

      await expect(
        adsService.byId(ad.id, { id: String(new Types.ObjectId()), canReview: false })
      ).rejects.toMatchObject({
        message: 'You do not have access to this ad request',
        extensions: { code: 'FORBIDDEN' },
      });

      const asReviewer = await adsService.byId(ad.id, {
        id: String(new Types.ObjectId()),
        canReview: true,
      });
      expect(asReviewer.id).toBe(ad.id);
    });
  });
});
