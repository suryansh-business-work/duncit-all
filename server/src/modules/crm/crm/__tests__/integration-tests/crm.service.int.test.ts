import { Types } from 'mongoose';
import { commsService } from '@services/comms/comms.service';
import { CommunicationLogModel } from '@modules/crm/communicationLog/communicationLog.model';
import { ManagedOptionModel } from '@modules/crm/managedOption/managedOption.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { CrmDynamicFieldModel, CrmServiceCatalogModel, HostLeadModel, VenueLeadModel } from '../../crm.model';
import { crmService } from '../../crm.service';
import * as C from '../../crm.constants';

/**
 * The CRM desk beyond its tables: the form configuration, the services and
 * dynamic-field catalogues, lead CRUD with its one-phone-per-lead rule, manual
 * notes, and the email / call actions that log every attempt against the lead.
 */

const venueInput = (over: Record<string, unknown> = {}) => ({
  venue_name: 'Smash Arena',
  city: 'Gurugram',
  full_address: 'Plot 12, Sector 44',
  contacts: [{ name: 'Rohit', role: 'Owner', mobile_number: '+919811000001', email: 'rohit@example.com' }],
  ...over,
});

afterEach(() => jest.restoreAllMocks());

describe('crmService.config', () => {
  it('serves the constant pick-lists and appends "Other" to every managed list', async () => {
    await CrmServiceCatalogModel.create([
      { name: 'Catering', kind: 'VENUE', sort_order: 1 },
      { name: 'Decor & Setup', kind: 'VENUE', sort_order: 0 },
      { name: 'DJ / Music', kind: 'HOST', sort_order: 0 },
      { name: 'Catering', kind: 'HOST', sort_order: 1 },
      { name: 'Valet', kind: 'VENUE', sort_order: 2, is_active: false },
    ]);
    await ManagedOptionModel.create([
      { name: 'Parking', group: 'AMENITY' },
      { name: 'Birthday parties', group: 'EVENT_SUITABILITY' },
    ]);

    const config = await crmService.config();

    expect(config.venue_services_offered_options).toEqual(['Decor & Setup', 'Catering', 'Other']);
    expect(config.host_services_offered_options).toEqual(['DJ / Music', 'Catering', 'Other']);
    expect(config.services_offered_options).toEqual(['Decor & Setup', 'Catering', 'Other', 'DJ / Music']);
    expect(config.amenities).toEqual(['Parking', 'Other']);
    expect(config.venue_event_suitability).toEqual(['Birthday parties', 'Other']);
    expect(config.venue_lead_statuses).toEqual(C.VENUE_LEAD_STATUSES);
    expect(config.priorities).toEqual(C.PRIORITIES);
  });

  it('does not add a second "Other" when the catalogue already has one', async () => {
    await CrmServiceCatalogModel.create({ name: 'Other', kind: 'VENUE' });
    const config = await crmService.config();
    expect(config.venue_services_offered_options).toEqual(['Other']);
  });
});

describe('crmService services catalogue', () => {
  it('creates a trimmed service, defaulting an unknown kind to VENUE, and refuses a duplicate', async () => {
    const created = await crmService.createService({ name: '  Photography  ', kind: 'NOPE' as never });
    expect(created).toMatchObject({ name: 'Photography', kind: 'VENUE', sort_order: 0, is_active: true });

    await expect(crmService.createService({ name: 'Photography', kind: 'VENUE' })).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });
    // The same name is a different service in another catalogue.
    const host = await crmService.createService({ name: 'Photography', kind: 'HOST', sort_order: 3, is_active: false });
    expect(host).toMatchObject({ kind: 'HOST', sort_order: 3, is_active: false });
  });

  it('refuses a blank name', async () => {
    await expect(crmService.createService({ name: '   ', kind: 'VENUE' })).rejects.toThrow('Service name is required');
  });

  it('lists active services by default, filters by kind, and includes inactive on request', async () => {
    await crmService.createService({ name: 'Catering', kind: 'VENUE' });
    await crmService.createService({ name: 'Bartender', kind: 'HOST' });
    await crmService.createService({ name: 'Valet', kind: 'VENUE', is_active: false });

    expect((await crmService.listServices()).map((s) => s!.name)).toEqual(['Bartender', 'Catering']);
    expect((await crmService.listServices('VENUE')).map((s) => s!.name)).toEqual(['Catering']);
    expect((await crmService.listServices('VENUE', true)).map((s) => s!.name)).toEqual(['Catering', 'Valet']);
  });

  it('renames, moves and toggles a service, refusing a clash in the target catalogue', async () => {
    const catering = await crmService.createService({ name: 'Catering', kind: 'VENUE' });
    await crmService.createService({ name: 'Buffet', kind: 'HOST' });

    await expect(crmService.updateService(catering!.id, { name: 'Buffet', kind: 'HOST' })).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });

    const updated = await crmService.updateService(catering!.id, {
      name: 'Outdoor catering',
      kind: 'HOST',
      sort_order: 5,
      is_active: false,
    });
    expect(updated).toMatchObject({ name: 'Outdoor catering', kind: 'HOST', sort_order: 5, is_active: false });

    // A blank name keeps the old one; null sort/active leave them as they are.
    const kept = await crmService.updateService(catering!.id, { name: '', sort_order: null, is_active: null });
    expect(kept).toMatchObject({ name: 'Outdoor catering', kind: 'HOST', sort_order: 5, is_active: false });
  });

  it('reports a missing service on update and delete, and deletes an existing one', async () => {
    const missing = new Types.ObjectId().toHexString();
    await expect(crmService.updateService(missing, { name: 'X' })).rejects.toMatchObject({
      message: 'Service not found',
      extensions: { code: 'NOT_FOUND' },
    });
    await expect(crmService.deleteService(missing)).rejects.toThrow('Service not found');

    const svc = await crmService.createService({ name: 'Ticketing', kind: 'VENUE' });
    expect(await crmService.deleteService(svc!.id)).toBe(true);
    expect(await CrmServiceCatalogModel.countDocuments()).toBe(0);
  });

  it('seeds each empty catalogue once, backfills a missing kind, and never re-seeds a drained one', async () => {
    await CrmServiceCatalogModel.collection.insertOne({ name: 'Legacy service', is_active: true, sort_order: 0 });

    await crmService.seedServiceDefaults();

    const defaults = C.SERVICES_OFFERED.filter((n) => n !== 'Other');
    expect(await CrmServiceCatalogModel.countDocuments({ name: 'Legacy service', kind: 'VENUE' })).toBe(1);
    // VENUE already held the backfilled legacy row, so only HOST is seeded.
    expect(await CrmServiceCatalogModel.countDocuments({ kind: 'VENUE' })).toBe(1);
    expect(await CrmServiceCatalogModel.countDocuments({ kind: 'HOST' })).toBe(defaults.length);

    await crmService.seedServiceDefaults();
    expect(await CrmServiceCatalogModel.countDocuments({ kind: 'HOST' })).toBe(defaults.length);
  });
});

describe('crmService lookups', () => {
  it('resolves a super category, and returns null for a blank or unknown id', async () => {
    const sports = await CategoryModel.create({ name: 'Sports', slug: 'sports', level: 'SUPER', icon: 'https://x/s.png' });
    expect(await crmService.superCategoryById(String(sports._id))).toEqual({
      id: String(sports._id),
      name: 'Sports',
      slug: 'sports',
      icon: 'https://x/s.png',
    });
    expect(await crmService.superCategoryById('')).toBeNull();
    expect(await crmService.superCategoryById(new Types.ObjectId().toHexString())).toBeNull();
  });

  it('returns linked hosts in the order asked, skipping stale and malformed ids', async () => {
    const a = await HostLeadModel.create({ host_name: 'Asha Events', city: 'Delhi', host_type: 'Event Organizer' });
    const b = await HostLeadModel.create({ host_name: 'Bran Meetups', lead_status: 'Won', priority: 'High' });

    const hosts = await crmService.linkedHostsFor([String(b._id), 'junk', new Types.ObjectId(), a._id]);

    expect(hosts).toEqual([
      { id: String(b._id), host_name: 'Bran Meetups', host_type: '', city: '', lead_status: 'Won', priority: 'High' },
      { id: String(a._id), host_name: 'Asha Events', host_type: 'Event Organizer', city: 'Delhi', lead_status: 'New', priority: 'Medium' },
    ]);
    expect(await crmService.linkedHostsFor([])).toEqual([]);
    expect(await crmService.linkedHostsFor(['junk', null])).toEqual([]);
    expect(await crmService.linkedHostsFor(null as never)).toEqual([]);
  });
});

describe('crmService dynamic fields', () => {
  it('creates a field with a slug key, normalised options and the right defaults', async () => {
    const field = await crmService.createDynamicField({
      name: ' Vendor GST Status! ',
      kind: 'select',
      options: ['Registered', { value: 'composition', label: '' }, { label: 'Exempt' }, '  ', { value: '' }, 42],
    });

    expect(field).toMatchObject({
      name: 'vendor_gst_status_',
      label: 'vendor_gst_status_',
      kind: 'select',
      options: [
        { value: 'Registered', label: 'Registered' },
        { value: 'composition', label: 'composition' },
        { value: 'Exempt', label: 'Exempt' },
      ],
      multi: false,
      placeholder: '',
      applies_to_venue: true,
      applies_to_host: true,
      applies_to_ecomm: false,
      required: false,
      sort_order: 0,
      is_active: true,
    });
  });

  it('refuses a blank key and a duplicate key', async () => {
    await expect(crmService.createDynamicField({ name: '   ' })).rejects.toThrow('Field key is required');
    await crmService.createDynamicField({ name: 'gst', label: 'GST' });
    await expect(crmService.createDynamicField({ name: 'GST' })).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
  });

  it('updates everything but the storage key', async () => {
    const field = await crmService.createDynamicField({ name: 'parking', label: 'Parking' });
    const updated = await crmService.updateDynamicField(field!.id, {
      name: 'renamed',
      label: ' Parking slots ',
      kind: 'number',
      options: ['a'],
      multi: true,
      placeholder: ' e.g. 20 ',
      default_value: ' 0 ',
      hint: ' Cars only ',
      applies_to_venue: true,
      applies_to_host: false,
      applies_to_ecomm: true,
      required: true,
      sort_order: 4,
      is_active: false,
    });
    expect(updated).toMatchObject({
      name: 'parking',
      label: 'Parking slots',
      kind: 'number',
      options: [{ value: 'a', label: 'a' }],
      multi: true,
      placeholder: 'e.g. 20',
      default_value: '0',
      hint: 'Cars only',
      applies_to_host: false,
      applies_to_ecomm: true,
      required: true,
      sort_order: 4,
      is_active: false,
    });
  });

  it('lists fields per lead kind, hiding inactive ones unless asked', async () => {
    await crmService.createDynamicField({ name: 'venue_only', applies_to_host: false, sort_order: 1 });
    await crmService.createDynamicField({ name: 'host_only', applies_to_venue: false, sort_order: 2 });
    await crmService.createDynamicField({ name: 'ecomm_too', applies_to_ecomm: true, sort_order: 3 });
    await crmService.createDynamicField({ name: 'retired', is_active: false, sort_order: 4 });

    const names = async (entity: Parameters<typeof crmService.listDynamicFields>[0], all = false) =>
      (await crmService.listDynamicFields(entity, all)).map((f) => f!.name);

    expect(await names('VENUE_LEAD')).toEqual(['venue_only', 'ecomm_too']);
    expect(await names('HOST_LEAD')).toEqual(['host_only', 'ecomm_too']);
    expect(await names('ECOMM_LEAD')).toEqual(['ecomm_too']);
    expect(await names(null)).toEqual(['venue_only', 'host_only', 'ecomm_too']);
    expect(await names(null, true)).toEqual(['venue_only', 'host_only', 'ecomm_too', 'retired']);
  });

  it('reads legacy rows with string options and unset flags', async () => {
    await CrmDynamicFieldModel.collection.insertOne({ name: 'legacy', label: 'Legacy', options: ['One', 'Two'] });
    const [field] = await crmService.listDynamicFields(null, true);
    expect(field).toMatchObject({
      options: [
        { value: 'One', label: 'One' },
        { value: 'Two', label: 'Two' },
      ],
      multi: false,
      placeholder: '',
      hint: '',
      applies_to_venue: true,
      applies_to_host: true,
      applies_to_ecomm: false,
      sort_order: 0,
      is_active: true,
      created_at: null,
    });
  });

  it('persists a new order as each field’s index', async () => {
    const a = await crmService.createDynamicField({ name: 'a_field', label: 'A' });
    const b = await crmService.createDynamicField({ name: 'b_field', label: 'B' });
    const c = await crmService.createDynamicField({ name: 'c_field', label: 'C' });

    const ordered = await crmService.reorderDynamicFields([c!.id, a!.id, b!.id]);

    expect(ordered.map((f) => [f!.name, f!.sort_order])).toEqual([
      ['c_field', 0],
      ['a_field', 1],
      ['b_field', 2],
    ]);
    expect((await crmService.reorderDynamicFields([])).map((f) => f!.name)).toEqual(['c_field', 'a_field', 'b_field']);
  });

  it('reports a missing field on update and delete, and deletes an existing one', async () => {
    const missing = new Types.ObjectId().toHexString();
    await expect(crmService.updateDynamicField(missing, { label: 'x' })).rejects.toThrow('Dynamic field not found');
    await expect(crmService.deleteDynamicField(missing)).rejects.toThrow('Dynamic field not found');
    const field = await crmService.createDynamicField({ name: 'temp' });
    expect(await crmService.deleteDynamicField(field!.id)).toBe(true);
    expect(await CrmDynamicFieldModel.countDocuments()).toBe(0);
  });
});

describe('crmService venue leads', () => {
  it('normalises ids, tags and dynamic values on create, and reads them back', async () => {
    const superId = new Types.ObjectId().toHexString();
    const hostId = new Types.ObjectId().toHexString();
    const lead = await crmService.createVenueLead(
      venueInput({
        super_category_id: superId,
        category_ids: [new Types.ObjectId().toHexString(), 'junk'],
        sub_category_ids: ['junk'],
        linked_host_ids: [hostId, 'junk'],
        tags: [' rooftop ', '', '  '],
        dynamic_values_json: '{"parking": 20}',
        next_follow_up_date: '2026-10-10T00:00:00.000Z',
        services_offered: [{ service: 'Catering' }],
      })
    );

    expect(lead).toMatchObject({
      venue_name: 'Smash Arena',
      super_category_id: superId,
      linked_host_ids: [hostId],
      sub_category_ids: [],
      tags: ['rooftop'],
      dynamic_values_json: '{"parking":20}',
      next_follow_up_date: '2026-10-10T00:00:00.000Z',
      preferred_event_date: null,
      services_offered: [{ service: 'Catering', custom_name: '', description: '' }],
      contacts: [{ name: 'Rohit', role: 'Owner', mobile_number: '+919811000001', whatsapp_number: '', email: 'rohit@example.com' }],
      activity_log: [],
    });
    expect(lead!.category_ids).toHaveLength(1);
    expect(await crmService.getVenueLead(lead!.id)).toMatchObject({ id: lead!.id, venue_name: 'Smash Arena' });
    expect(await crmService.getVenueLead(new Types.ObjectId().toHexString())).toBeNull();
  });

  it('stores an unparseable or blank dynamic-values payload as an empty map, and a bad super category as none', async () => {
    const bad = await crmService.createVenueLead(
      venueInput({ dynamic_values_json: '{not json', super_category_id: 'junk', contacts: [] })
    );
    expect(bad).toMatchObject({ dynamic_values_json: '{}', super_category_id: null });
    const blank = await crmService.createVenueLead(
      venueInput({ venue_name: 'Blank', dynamic_values_json: '   ', contacts: [{ name: 'X', mobile_number: '9811000002' }] })
    );
    expect(blank!.dynamic_values_json).toBe('{}');
  });

  it('refuses a second lead with the same phone, whatever its formatting', async () => {
    await crmService.createVenueLead(venueInput());
    await expect(
      crmService.createVenueLead(venueInput({ venue_name: 'Copy', contacts: [{ name: 'R', mobile_number: '9811000001' }] }))
    ).rejects.toMatchObject({
      message: 'A venue lead with this phone number already exists. Each lead must have a unique phone number.',
      extensions: { code: 'DUPLICATE_LEAD' },
    });
    // Too short to identify a lead — not checked.
    await crmService.createVenueLead(venueInput({ venue_name: 'Short', contacts: [{ name: 'S', mobile_number: '12345' }] }));
    await crmService.createVenueLead(venueInput({ venue_name: 'Short 2', contacts: [{ name: 'S', mobile_number: '12345' }] }));
    expect(await VenueLeadModel.countDocuments()).toBe(3);
  });

  it('lets a lead keep its own phone on update but not take another lead’s', async () => {
    const own = await crmService.createVenueLead(venueInput());
    await crmService.createVenueLead(venueInput({ venue_name: 'Other', contacts: [{ name: 'O', mobile_number: '9811000009' }] }));

    const updated = await crmService.updateVenueLead(own!.id, venueInput({ remarks: 'Called twice' }));
    expect(updated).toMatchObject({ remarks: 'Called twice', next_follow_up_date: null });

    await expect(
      crmService.updateVenueLead(own!.id, venueInput({ contacts: [{ name: 'O', mobile_number: '+91-9811000009' }] }))
    ).rejects.toMatchObject({ extensions: { code: 'DUPLICATE_LEAD' } });
  });

  it('reports a missing lead on update and delete, and deletes an existing one', async () => {
    const missing = new Types.ObjectId().toHexString();
    await expect(crmService.updateVenueLead(missing, { remarks: 'x' })).rejects.toThrow('Venue lead not found');
    await expect(crmService.deleteVenueLead(missing)).rejects.toThrow('Venue lead not found');
    const lead = await crmService.createVenueLead(venueInput());
    expect(await crmService.deleteVenueLead(lead!.id)).toBe(true);
  });

  it('filters the list by city, status, priority, super category and an escaped search', async () => {
    const superId = new Types.ObjectId().toHexString();
    await crmService.createVenueLead(venueInput({ venue_name: 'C++ Courts', city: 'Pune', lead_status: 'Won', priority: 'High', super_category_id: superId }));
    await crmService.createVenueLead(
      venueInput({ venue_name: 'Smash Arena', city: 'Delhi', contacts: [{ name: 'Z', mobile_number: '9811000003', email: 'z@example.com' }] })
    );

    const names = async (filter: Record<string, unknown> | null) => (await crmService.listVenueLeads(filter)).map((l) => l!.venue_name);

    expect(await names({ city: 'Pune' })).toEqual(['C++ Courts']);
    expect(await names({ lead_status: 'Won', priority: 'High' })).toEqual(['C++ Courts']);
    expect(await names({ super_category_id: superId })).toEqual(['C++ Courts']);
    expect(await names({ search: ' c++ ' })).toEqual(['C++ Courts']);
    expect(await names({ search: 'z@example' })).toEqual(['Smash Arena']);
    // A malformed super category is ignored rather than matching nothing.
    expect((await names({ super_category_id: 'junk' })).sort()).toEqual(['C++ Courts', 'Smash Arena']);
    expect(await names(null)).toHaveLength(2);
  });
});

describe('crmService host and ecomm leads', () => {
  it('creates, reads, updates and deletes a host lead with its two dates', async () => {
    const lead = await crmService.createHostLead({
      host_name: 'Asha Events',
      city: 'Delhi',
      preferred_event_date: '2026-11-01T00:00:00.000Z',
      contacts: [{ name: 'Asha', mobile_number: '9822000001' }],
    });
    expect(lead).toMatchObject({ preferred_event_date: '2026-11-01T00:00:00.000Z', next_follow_up_date: null });
    expect(await crmService.getHostLead(lead!.id)).toMatchObject({ host_name: 'Asha Events' });
    expect(await crmService.getHostLead(new Types.ObjectId().toHexString())).toBeNull();
    expect((await crmService.listHostLeads({ search: 'asha' })).map((l) => l!.host_name)).toEqual(['Asha Events']);

    const updated = await crmService.updateHostLead(lead!.id, {
      host_name: 'Asha Events Co',
      next_follow_up_date: '2026-10-20T00:00:00.000Z',
    });
    expect(updated).toMatchObject({ host_name: 'Asha Events Co', next_follow_up_date: '2026-10-20T00:00:00.000Z', preferred_event_date: null });

    await expect(
      crmService.createHostLead({ host_name: 'Dup', contacts: [{ name: 'A', mobile_number: '+919822000001' }] })
    ).rejects.toThrow('A host lead with this phone number already exists');

    expect(await crmService.deleteHostLead(lead!.id)).toBe(true);
    await expect(crmService.deleteHostLead(lead!.id)).rejects.toThrow('Host lead not found');
    await expect(crmService.updateHostLead(lead!.id, { host_name: 'X' })).rejects.toThrow('Host lead not found');
  });

  it('creates, reads, updates and deletes an ecomm lead', async () => {
    const lead = await crmService.createEcommLead({
      seller_name: 'Alpha Traders',
      brand_name: 'Alpine',
      contacts: [{ name: 'Al', mobile_number: '9833000001' }],
    });
    expect(await crmService.getEcommLead(lead!.id)).toMatchObject({ seller_name: 'Alpha Traders', brand_name: 'Alpine' });
    expect(await crmService.getEcommLead(new Types.ObjectId().toHexString())).toBeNull();
    expect((await crmService.listEcommLeads({ search: 'alpha' })).map((l) => l!.seller_name)).toEqual(['Alpha Traders']);

    const updated = await crmService.updateEcommLead(lead!.id, { seller_name: 'Alpha Traders Pvt', tags: ['wholesale'] });
    expect(updated).toMatchObject({ seller_name: 'Alpha Traders Pvt', tags: ['wholesale'] });

    await expect(
      crmService.createEcommLead({ seller_name: 'Dup', contacts: [{ name: 'A', mobile_number: '09833000001' }] })
    ).rejects.toThrow('A ecomm lead with this phone number already exists');

    expect(await crmService.deleteEcommLead(lead!.id)).toBe(true);
    await expect(crmService.deleteEcommLead(lead!.id)).rejects.toThrow('Ecomm lead not found');
    await expect(crmService.updateEcommLead(lead!.id, { seller_name: 'X' })).rejects.toThrow('Ecomm lead not found');
  });
});

describe('crmService.addManualLog', () => {
  it('appends a trimmed NOTE to the lead and returns it', async () => {
    const lead = await crmService.createHostLead({ host_name: 'Asha Events' });
    const entry = await crmService.addManualLog({
      entity_type: 'HOST_LEAD',
      entity_id: lead!.id,
      summary: '  Site visit ',
      body_html: ' <p>Liked the hall</p> ',
      body_text: ' Liked the hall ',
      by: 'crm-user-1',
    });

    expect(entry).toMatchObject({
      type: 'NOTE',
      summary: 'Site visit',
      status: '',
      target: '',
      body_html: '<p>Liked the hall</p>',
      body_text: 'Liked the hall',
      created_by: 'crm-user-1',
    });
    expect(typeof entry.created_at).toBe('string');
    const stored = await HostLeadModel.findById(lead!.id).lean();
    expect(stored!.activity_log).toHaveLength(1);
    expect(stored!.activity_log[0]).toMatchObject({ type: 'NOTE', body_text: 'Liked the hall' });
  });

  it('refuses an empty body and a lead that does not exist', async () => {
    await expect(
      crmService.addManualLog({ entity_type: 'VENUE_LEAD', entity_id: new Types.ObjectId().toHexString(), body_html: '  ' })
    ).rejects.toThrow('Log body is required');
    await expect(
      crmService.addManualLog({ entity_type: 'ECOMM_LEAD', entity_id: new Types.ObjectId().toHexString(), body_html: '<p>x</p>' })
    ).rejects.toThrow('Ecomm lead not found');
  });

  it('defaults the summary, plain text and author when they are not given', async () => {
    const lead = await crmService.createVenueLead(venueInput());
    const entry = await crmService.addManualLog({ entity_type: 'VENUE_LEAD', entity_id: lead!.id, body_html: '<b>hi</b>' });
    expect(entry).toMatchObject({ summary: '', body_text: '', created_by: null });
  });
});

describe('crmService email and call actions', () => {
  const providerId = new Types.ObjectId().toHexString();

  it('emails a venue contact, logs it SENT and records it on the lead', async () => {
    const send = jest.spyOn(commsService, 'sendEmail').mockResolvedValue({
      ok: true,
      message: 'Sent',
      provider: 'smtp',
      provider_id: providerId,
      external_id: 'msg-001',
    });
    const lead = await crmService.createVenueLead(venueInput());
    const attachments = [{ url: 'https://ik.imagekit.io/duncit/brochure.pdf', name: 'Brochure' }];

    const result = await crmService.emailVenueLeadContact(lead!.id, 'rohit@example.com', 'Partnership', '<p>Hi</p>', providerId, 'crm-1', attachments);

    expect(result.ok).toBe(true);
    expect(send).toHaveBeenCalledWith({ to: 'rohit@example.com', subject: 'Partnership', body: '<p>Hi</p>', provider_id: providerId, attachments });
    const log = await CommunicationLogModel.findOne({ entity_id: new Types.ObjectId(lead!.id) }).lean();
    expect(log).toMatchObject({
      type: 'EMAIL',
      entity_type: 'VENUE_LEAD',
      provider_name: 'smtp',
      contact_value: 'rohit@example.com',
      subject: 'Partnership',
      status: 'SENT',
      error_message: '',
      external_id: 'msg-001',
      created_by: 'crm-1',
    });
    expect(String(log!.provider_id)).toBe(providerId);
    const stored = await VenueLeadModel.findById(lead!.id).lean();
    expect(stored!.activity_log[0]).toMatchObject({ type: 'EMAIL', summary: 'Partnership', status: 'SENT', target: 'rohit@example.com' });
  });

  it('logs a failed call with the provider’s reason against a host lead', async () => {
    jest.spyOn(commsService, 'call').mockResolvedValue({ ok: false, message: 'Twilio is not configured for calls', provider: 'twilio' });
    const lead = await crmService.createHostLead({ host_name: 'Asha Events' });

    const result = await crmService.callHostLeadContact(lead!.id, '+919822000001');

    expect(result.ok).toBe(false);
    const log = await CommunicationLogModel.findOne({ entity_type: 'HOST_LEAD' }).lean();
    expect(log).toMatchObject({ type: 'CALL', status: 'FAILED', error_message: 'Twilio is not configured for calls', provider_id: null, created_by: null });
    const stored = await HostLeadModel.findById(lead!.id).lean();
    expect(stored!.activity_log[0]).toMatchObject({ type: 'CALL', summary: 'Outbound call', status: 'FAILED' });
  });

  it('marks a placed call INITIATED, and an ecomm email SENT', async () => {
    jest.spyOn(commsService, 'call').mockResolvedValue({ ok: true, message: 'Calling', provider: 'twilio', external_id: 'CA123' });
    jest.spyOn(commsService, 'sendEmail').mockResolvedValue({ ok: true, message: 'Sent', provider: 'smtp' });
    const venue = await crmService.createVenueLead(venueInput());
    const ecomm = await crmService.createEcommLead({ seller_name: 'Alpha Traders' });

    await crmService.callVenueLeadContact(venue!.id, '+919811000001', providerId, 'crm-2');
    await crmService.emailEcommLeadContact(ecomm!.id, 'al@example.com', 'Listing', 'Hello');
    await crmService.callEcommLeadContact(ecomm!.id, '+919833000001');
    await crmService.emailHostLeadContact((await crmService.createHostLead({ host_name: 'H' }))!.id, 'h@example.com', 'Hi', 'Body');

    const statuses = await CommunicationLogModel.find().sort({ _id: 1 }).lean();
    expect(statuses.map((l) => [l.entity_type, l.type, l.status])).toEqual([
      ['VENUE_LEAD', 'CALL', 'INITIATED'],
      ['ECOMM_LEAD', 'EMAIL', 'SENT'],
      ['ECOMM_LEAD', 'CALL', 'INITIATED'],
      ['HOST_LEAD', 'EMAIL', 'SENT'],
    ]);
    expect(String(statuses[0].provider_id)).toBe(providerId);
  });

  it.each([
    ['emailVenueLeadContact', 'Venue lead not found'],
    ['callVenueLeadContact', 'Venue lead not found'],
    ['emailHostLeadContact', 'Host lead not found'],
    ['callHostLeadContact', 'Host lead not found'],
    ['emailEcommLeadContact', 'Ecomm lead not found'],
    ['callEcommLeadContact', 'Ecomm lead not found'],
  ] as const)('%s refuses a lead that does not exist, without contacting anyone', async (action, message) => {
    const send = jest.spyOn(commsService, 'sendEmail');
    const call = jest.spyOn(commsService, 'call');
    const fn = crmService[action] as (...args: unknown[]) => Promise<unknown>;
    await expect(fn(new Types.ObjectId().toHexString(), 'x@example.com', 'S', 'B')).rejects.toThrow(message);
    expect(send).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });
});
