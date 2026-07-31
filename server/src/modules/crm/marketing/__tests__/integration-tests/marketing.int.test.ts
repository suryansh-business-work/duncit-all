import { marketingService } from '../../marketing.service';
import { MarketingCampaignModel } from '../../marketing.model';

const MJML = '<mjml><mj-body><mj-text>Hello there</mj-text></mj-body></mjml>';
/** What the renderer will actually accept — mj-text has to sit in a column. */
const VALID_MJML =
  '<mjml><mj-body><mj-section><mj-column><mj-text>Hello there</mj-text></mj-column></mj-section></mj-body></mjml>';

const seedCampaign = (n: {
  campaign_id: string;
  name: string;
  subject: string;
  channel?: 'EMAIL';
  status?: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
}) =>
  MarketingCampaignModel.create({
    campaign_id: n.campaign_id,
    name: n.name,
    channel: n.channel ?? 'EMAIL',
    audience: 'NEWSLETTER_SUBSCRIBERS',
    subject: n.subject,
    mjml: MJML,
    status: n.status ?? 'DRAFT',
  });

describe('marketingService integration', () => {
  it('lists no campaigns on an empty dataset', async () => {
    expect(await marketingService.list()).toEqual([]);
  });

  it('serves the marketingCampaignsTable page with search, filters, sort and paging', async () => {
    await seedCampaign({ campaign_id: 'c1', name: 'August Push', subject: 'Pods near you', status: 'SENT' });
    await seedCampaign({ campaign_id: 'c2', name: 'Diwali Blast', subject: 'Festive offers' });
    await seedCampaign({ campaign_id: 'c3', name: 'Welcome Drip', subject: 'Getting started' });

    // Default sort created_at desc (newest first) + clamp defaults.
    const all = await marketingService.table();
    expect(all.total).toBe(3);
    expect(all.rows[0].name).toBe('Welcome Drip');
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans name and subject.
    const bySubject = await marketingService.table({ search: 'festive' });
    expect(bySubject.rows.map((c) => c.name)).toEqual(['Diwali Blast']);
    expect(bySubject.total).toBe(1);

    // Enum filters narrow.
    const sent = await marketingService.table({
      filters: [{ field: 'status', op: 'eq', value: 'SENT' }],
    });
    expect(sent.rows.map((c) => c.name)).toEqual(['August Push']);
    // Email is the only channel now, so the filter matches every campaign.
    const byChannel = await marketingService.table({
      filters: [{ field: 'channel', op: 'eq', value: 'EMAIL' }],
    });
    expect(byChannel.total).toBe(3);

    // Allowlisted sort override + paging.
    const asc = await marketingService.table({ sort_by: 'name', sort_dir: 'asc' });
    expect(asc.rows.map((c) => c.name)).toEqual(['August Push', 'Diwali Blast', 'Welcome Drip']);
    const page2 = await marketingService.table({ page: 2, page_size: 1, sort_by: 'name', sort_dir: 'asc' });
    expect(page2.rows.map((c) => c.name)).toEqual(['Diwali Blast']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('reads one campaign in full, and refuses an id that is not there', async () => {
    await seedCampaign({ campaign_id: 'c1', name: 'August Push', subject: 'Pods near you' });

    const one = await marketingService.byId('c1');
    expect(one.name).toBe('August Push');
    expect(one.mjml).toBe(MJML);

    await expect(marketingService.byId('nope')).rejects.toThrow(/not found/i);
  });

  it('deletes a campaign, and refuses an id that is not there', async () => {
    await seedCampaign({ campaign_id: 'c1', name: 'August Push', subject: 'Pods near you' });

    expect(await marketingService.remove('c1')).toBe(true);
    expect(await MarketingCampaignModel.findOne({ campaign_id: 'c1' }).exec()).toBeNull();

    await expect(marketingService.remove('c1')).rejects.toThrow(/not found/i);
  });

  it('refuses to delete a campaign that is sending right now', async () => {
    await seedCampaign({
      campaign_id: 'c1',
      name: 'In flight',
      subject: 'Going out',
      status: 'SENDING',
    });

    await expect(marketingService.remove('c1')).rejects.toThrow(/sending right now/i);
    // Still there — a refused delete must not half-happen.
    expect(await MarketingCampaignModel.findOne({ campaign_id: 'c1' }).exec()).not.toBeNull();
  });

  // A scheduled campaign owns a live setTimeout. Deleting the document without
  // clearing it leaves a timer that fires at the scheduled hour against a
  // campaign that no longer exists.
  it('cancels the pending send when a scheduled campaign is deleted', async () => {
    const clearSpy = jest.spyOn(globalThis, 'clearTimeout');
    const scheduled = await marketingService.create({
      name: 'Next week',
      channel: 'EMAIL',
      audience: 'NEWSLETTER_SUBSCRIBERS',
      subject: 'Coming soon',
      mjml: VALID_MJML,
      scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    expect(scheduled.status).toBe('SCHEDULED');
    clearSpy.mockClear();

    expect(await marketingService.remove(scheduled.campaign_id)).toBe(true);
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('lists every variable a campaign may use, with what it renders to', async () => {
    const variables = await marketingService.variables();
    expect(variables.map((v) => v.name)).toEqual(['app_name']);
    expect(variables[0].sample).toBeTruthy();
    expect(variables[0].description).toMatch(/branding/i);
  });
});
