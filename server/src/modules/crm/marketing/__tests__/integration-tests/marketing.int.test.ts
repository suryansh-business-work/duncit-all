import { marketingService } from '../../marketing.service';
import { MarketingCampaignModel } from '../../marketing.model';

const MJML = '<mjml><mj-body><mj-text>Hello there</mj-text></mj-body></mjml>';

const seedCampaign = (n: {
  campaign_id: string;
  name: string;
  subject: string;
  channel?: 'EMAIL' | 'WHATSAPP';
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
    await seedCampaign({ campaign_id: 'c2', name: 'Diwali Blast', subject: 'Festive offers', channel: 'WHATSAPP' });
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
    const whatsapp = await marketingService.table({
      filters: [{ field: 'channel', op: 'eq', value: 'WHATSAPP' }],
    });
    expect(whatsapp.rows.map((c) => c.name)).toEqual(['Diwali Blast']);

    // Allowlisted sort override + paging.
    const asc = await marketingService.table({ sort_by: 'name', sort_dir: 'asc' });
    expect(asc.rows.map((c) => c.name)).toEqual(['August Push', 'Diwali Blast', 'Welcome Drip']);
    const page2 = await marketingService.table({ page: 2, page_size: 1, sort_by: 'name', sort_dir: 'asc' });
    expect(page2.rows.map((c) => c.name)).toEqual(['Diwali Blast']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});
