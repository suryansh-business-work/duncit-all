/**
 * Handing a lead to sales goes through the CRM's own create functions, so a
 * venue, host or ecomm lead appears exactly as one made in the CRM portal
 * would — the CRM's phone-uniqueness rule included — and a lead can only ever
 * be promoted once, into the kind its pipeline fits.
 */
import { UserModel } from '@modules/access/user/user.model';
import { EcommLeadModel, HostLeadModel, VenueLeadModel } from '@modules/crm/crm/crm.model';
import { MarketingLeadModel } from '../../marketingLead.model';
import { marketingLeadService as svc } from '../../marketingLead.service';
import { crmContacts, promoteToCrm } from '../../marketingLead.promote';

const makeUser = () =>
  UserModel.create({
    auth: { email: 'meera@duncit.com' },
    profile: { first_name: 'Meera', last_name: 'Manager' },
    metadata: { status: 'ACTIVE', role_keys: ['MARKETING_MANAGER'] },
  });

afterEach(async () => {
  await Promise.all([
    MarketingLeadModel.deleteMany({}),
    VenueLeadModel.deleteMany({}),
    HostLeadModel.deleteMany({}),
    EcommLeadModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
});

describe('crmContacts', () => {
  it('makes one contact per phone, spreads the emails over them, and one contact for an email-only lead', () => {
    expect(crmContacts({ name: 'Cafe', phones: ['911', '922'], emails: ['a@b.in'] })).toEqual([
      { name: 'Cafe', role: '', mobile_number: '911', whatsapp_number: '911', email: 'a@b.in' },
      { name: 'Cafe', role: '', mobile_number: '922', whatsapp_number: '922', email: '' },
    ]);
    expect(crmContacts({ name: 'Cafe', phones: [], emails: ['a@b.in', 'c@d.in'] })).toEqual([
      { name: 'Cafe', role: '', mobile_number: '', whatsapp_number: '', email: 'a@b.in' },
    ]);
    expect(crmContacts({ name: 'Cafe', phones: [], emails: [] })).toEqual([]);
  });
});

describe('promoteToCrm', () => {
  it('makes a venue lead through the CRM, remembers it on the lead, and refuses to do it twice', async () => {
    const user = { id: String((await makeUser())._id) };
    const lead = (
      await svc.create(
        {
          name: 'Blue Cafe',
          company: 'Blue Cafe Pvt',
          pipeline: 'VENUE',
          source: 'INSTAGRAM',
          city: 'Pune',
          phones: ['919876543210'],
          emails: ['hi@bluecafe.in'],
          website: 'bluecafe.in',
          tags: ['coffee'],
          score_reason: 'Hosts brunches',
        },
        user
      )
    ).lead;

    const promoted = await promoteToCrm(lead.id, 'VENUE', user);
    expect(promoted.crm_ref).toMatchObject({ kind: 'VENUE', id: expect.any(String), promoted_by: user.id });
    expect(promoted.crm_ref?.promoted_at).toEqual(expect.any(String));
    expect(promoted.timeline.at(-1)).toMatchObject({ kind: 'PROMOTED', text: 'Promoted to the CRM as a VENUE lead', by_name: 'Meera Manager' });
    expect(promoted.stage).toBe('NEW');

    const venue = await VenueLeadModel.findById(promoted.crm_ref?.id).lean();
    expect(venue).toMatchObject({
      venue_name: 'Blue Cafe Pvt',
      city: 'Pune',
      full_address: 'Blue Cafe Pvt, Pune',
      website: 'bluecafe.in',
      tags: ['coffee'],
      lead_source: 'Instagram',
      lead_status: 'New',
    });
    expect(venue?.contacts).toEqual([expect.objectContaining({ name: 'Blue Cafe', mobile_number: '919876543210', email: 'hi@bluecafe.in' })]);
    expect(venue?.remarks).toBe(`Promoted from Marketing lead ${lead.id}. Fit: Hosts brunches`);

    await expect(promoteToCrm(lead.id, 'VENUE', user)).rejects.toThrow('already promoted to a VENUE lead');
    expect(await VenueLeadModel.countDocuments()).toBe(1);
    const page = await svc.table({ filters: [{ field: 'has_crm_ref', op: 'is_true' }] });
    expect(page.rows.map((r) => r.id)).toEqual([lead.id]);
  });

  it('makes a host lead from a HOST lead and an ecomm lead from a BRAND or ADVERTISER lead', async () => {
    const user = { id: String((await makeUser())._id) };
    const host = (await svc.create({ name: 'Rani', company: 'Rani Events', pipeline: 'HOST', instagram_handle: 'rani.events', emails: ['rani@events.in'] }, user)).lead;
    const brand = (await svc.create({ name: 'Zed', company: 'Zed Brand', pipeline: 'BRAND', website: 'zed.in', phones: ['9123456789'] }, user)).lead;
    const advertiser = (await svc.create({ name: 'Ad Co', pipeline: 'ADVERTISER', source: 'IMPORT' }, user)).lead;

    const hostDone = await promoteToCrm(host.id, 'HOST', user);
    const hostRow = await HostLeadModel.findById(hostDone.crm_ref?.id).lean();
    expect(hostRow).toMatchObject({
      host_name: 'Rani',
      organization_name: 'Rani Events',
      instagram_link: 'https://www.instagram.com/rani.events/',
      lead_source: 'Other',
      contacts: [expect.objectContaining({ email: 'rani@events.in', mobile_number: '' })],
    });
    expect(hostRow?.notes).toBe(`Promoted from Marketing lead ${host.id}.`);

    const brandDone = await promoteToCrm(brand.id, 'ECOMM', user);
    expect(await EcommLeadModel.findById(brandDone.crm_ref?.id).lean()).toMatchObject({
      seller_name: 'Zed',
      brand_name: 'Zed Brand',
      website: 'zed.in',
      contacts: [expect.objectContaining({ mobile_number: '9123456789' })],
    });

    const adDone = await promoteToCrm(advertiser.id, 'ECOMM', user);
    expect(await EcommLeadModel.findById(adDone.crm_ref?.id).lean()).toMatchObject({ seller_name: 'Ad Co', lead_source: 'Other', contacts: [] });
  });

  it('refuses a kind the pipeline does not fit, a pipeline that has no CRM kind, and a venue without a city', async () => {
    const user = { id: String((await makeUser())._id) };
    const general = (await svc.create({ name: 'Someone' }, user)).lead;
    const influencer = (await svc.create({ name: 'Creator', pipeline: 'INFLUENCER' }, user)).lead;
    const host = (await svc.create({ name: 'Rani', pipeline: 'HOST' }, user)).lead;
    const venue = (await svc.create({ name: 'Blue Cafe', pipeline: 'VENUE' }, user)).lead;

    await expect(promoteToCrm(general.id, 'VENUE', user)).rejects.toThrow('A GENERAL lead cannot be promoted. Only VENUE, HOST, BRAND and ADVERTISER leads become CRM leads (VENUE, HOST, ECOMM).');
    await expect(promoteToCrm(influencer.id, 'HOST', user)).rejects.toThrow('cannot be promoted');
    await expect(promoteToCrm(host.id, 'VENUE', user)).rejects.toThrow('A HOST lead becomes a HOST lead in the CRM, not VENUE.');
    await expect(promoteToCrm(venue.id, 'VENUE', user)).rejects.toThrow('Add a city');
    await expect(promoteToCrm(venue.id, 'STORE' as never, user)).rejects.toThrow('kind does not exist');
    await expect(promoteToCrm('000000000000000000000000', 'VENUE', user)).rejects.toThrow('Lead not found');
    expect(await VenueLeadModel.countDocuments()).toBe(0);
    expect(await HostLeadModel.countDocuments()).toBe(0);
    expect(await MarketingLeadModel.countDocuments({ promoted: true })).toBe(0);
  });

  it("passes the CRM's own refusal on and lets go of the lead, so it can be promoted once the clash is fixed", async () => {
    const user = { id: String((await makeUser())._id) };
    await VenueLeadModel.create({ venue_name: 'Old Cafe', city: 'Pune', full_address: 'MG Road', contacts: [{ name: 'Old', mobile_number: '9876543210' }] });
    const lead = (await svc.create({ name: 'Blue Cafe', pipeline: 'VENUE', city: 'Pune', phones: ['919876543210'] }, user)).lead;

    await expect(promoteToCrm(lead.id, 'VENUE', user)).rejects.toThrow('A venue lead with this phone number already exists');
    const stored = await MarketingLeadModel.findById(lead.id).lean();
    expect(stored).toMatchObject({ promoted: false });
    expect(stored?.crm_ref?.kind).toBeNull();
    expect(await VenueLeadModel.countDocuments()).toBe(1);

    await VenueLeadModel.deleteMany({});
    const promoted = await promoteToCrm(lead.id, 'VENUE', user);
    expect(promoted.crm_ref?.kind).toBe('VENUE');
    expect(await VenueLeadModel.countDocuments()).toBe(1);
  });

  it('lets only the first of two racing promotions make a CRM record', async () => {
    const user = { id: String((await makeUser())._id) };
    const lead = (await svc.create({ name: 'Blue Cafe', pipeline: 'VENUE', city: 'Pune' }, user)).lead;
    const outcomes = await Promise.allSettled([promoteToCrm(lead.id, 'VENUE', user), promoteToCrm(lead.id, 'VENUE', user)]);
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
    const refused = outcomes.find((o) => o.status === 'rejected') as PromiseRejectedResult;
    expect(String(refused.reason)).toMatch(/already promoted/);
    expect(await VenueLeadModel.countDocuments()).toBe(1);
  });
});
