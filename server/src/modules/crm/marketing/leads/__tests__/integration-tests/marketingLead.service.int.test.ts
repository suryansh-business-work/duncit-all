/**
 * The lead pipeline against a real database: one upsert for every source,
 * with a second sighting merged by phone, email, website or handle; the
 * table's filters and search; and the stage, owner and note actions each
 * leaving their mark on the timeline.
 */
import { UserModel } from '@modules/access/user/user.model';
import { MarketingLeadModel } from '../../marketingLead.model';
import { marketingLeadService as svc, upsertLead } from '../../marketingLead.service';
import { dedupeKeys, emailKey, handleKey, keyMatch, phoneKey, websiteHost } from '../../marketingLead.keys';
import { SYSTEM_LEAD_ACTOR } from '../../marketingLead.types';

let userSeq = 0;
const makeUser = (first: string, over: Record<string, unknown> = {}) => {
  userSeq += 1;
  return UserModel.create({
    auth: { email: `${first.toLowerCase()}${userSeq}@duncit.com` },
    profile: { first_name: first, last_name: 'Staff' },
    metadata: { status: 'ACTIVE', role_keys: ['MARKETING_MANAGER'] },
    ...over,
  });
};

const asha = async () => {
  const user = await makeUser('Asha');
  return { id: String(user._id), email: 'asha@duncit.com' };
};

afterEach(async () => {
  await Promise.all([MarketingLeadModel.deleteMany({}), UserModel.deleteMany({})]);
});

describe('dedupe keys', () => {
  it('reduce a phone to its last ten digits, an email to lowercase, a website to its host and a handle to its name', () => {
    expect(phoneKey('+91 98765-43210')).toBe('9876543210');
    expect(phoneKey('09876543210')).toBe('9876543210');
    expect(phoneKey('12345')).toBe('');
    expect(emailKey(' Hi@Cafe.IN ')).toBe('hi@cafe.in');
    expect(emailKey('not an email')).toBe('');
    expect(websiteHost('https://www.Cafe.in/menu')).toBe('cafe.in');
    expect(websiteHost('cafe.in')).toBe('cafe.in');
    expect(websiteHost('ftp://cafe.in')).toBe('');
    expect(websiteHost('just words')).toBe('');
    expect(websiteHost('localhost')).toBe('');
    expect(handleKey('@Pawsome.Pune')).toBe('pawsome.pune');
    expect(handleKey('https://www.instagram.com/Pawsome.Pune/')).toBe('pawsome.pune');
    expect(handleKey('not a handle!')).toBe('');
  });

  it('build a match only from the keys a lead has', () => {
    expect(keyMatch(dedupeKeys({}))).toBeNull();
    expect(keyMatch(dedupeKeys({ phones: ['9876543210'], website: 'cafe.in' }))).toEqual({
      $or: [{ phone_keys: { $in: ['9876543210'] } }, { website_host: 'cafe.in' }],
    });
  });
});

describe('upsertLead', () => {
  it('adds a new lead with its keys and a CREATED entry, and refuses nonsense', async () => {
    const { lead, merged } = await upsertLead(
      { name: ' The Cafe ', phones: ['+91 98765 43210'], emails: ['Hi@Cafe.in'], website: 'www.cafe.in', instagram_handle: '@TheCafe', score: 140.4 },
      SYSTEM_LEAD_ACTOR
    );
    expect(merged).toBe(false);
    expect(lead).toMatchObject({
      name: 'The Cafe',
      pipeline: 'GENERAL',
      stage: 'NEW',
      source: 'MANUAL',
      phones: ['919876543210'],
      emails: ['hi@cafe.in'],
      instagram_handle: 'thecafe',
      instagram_url: 'https://www.instagram.com/thecafe/',
      score: 100,
      owner_name: null,
      crm_ref: null,
    });
    expect(lead.timeline).toEqual([expect.objectContaining({ kind: 'CREATED', text: 'Added from MANUAL', by_name: 'System' })]);
    const stored = await MarketingLeadModel.findById(lead.id).lean();
    expect(stored).toMatchObject({ phone_keys: ['9876543210'], email_keys: ['hi@cafe.in'], website_host: 'cafe.in', promoted: false });

    await expect(upsertLead({ name: '' }, SYSTEM_LEAD_ACTOR)).rejects.toThrow('Give the lead a name');
    await expect(upsertLead({ name: 'X', emails: ['nope'] }, SYSTEM_LEAD_ACTOR)).rejects.toThrow('"nope" is not an email address');
    await expect(upsertLead({ name: 'X', phones: ['12'] }, SYSTEM_LEAD_ACTOR)).rejects.toThrow('"12" is not a phone number');
    await expect(upsertLead({ name: 'X', website: 'not a site' }, SYSTEM_LEAD_ACTOR)).rejects.toThrow('not a web address');
    await expect(upsertLead({ name: 'X', instagram_handle: 'no way!' }, SYSTEM_LEAD_ACTOR)).rejects.toThrow('Instagram handle');
    await expect(upsertLead({ name: 'X', pipeline: 'NOPE' as never }, SYSTEM_LEAD_ACTOR)).rejects.toThrow('pipeline does not exist');
  });

  it.each([
    ['phone', { phones: ['09876543210'], emails: ['owner@cafe.in'] }],
    ['email', { emails: ['HI@cafe.in', 'owner@cafe.in'] }],
    ['website', { website: 'https://cafe.in/about', emails: ['owner@cafe.in'] }],
    ['handle', { instagram_handle: 'https://instagram.com/thecafe', emails: ['owner@cafe.in'] }],
  ])('merges a second sighting that matches by %s, filling gaps and noting the source', async (_key, contact) => {
    const first = await upsertLead(
      { name: 'The Cafe', phones: ['9876543210'], emails: ['hi@cafe.in'], website: 'cafe.in', instagram_handle: 'thecafe' },
      SYSTEM_LEAD_ACTOR
    );
    const again = await upsertLead(
      { name: 'Ignored', company: 'Cafe Pvt Ltd', city: 'Pune', pipeline: 'VENUE', source: 'INSTAGRAM', score: 70, tags: ['coffee'], ...contact },
      SYSTEM_LEAD_ACTOR
    );
    expect(again.merged).toBe(true);
    expect(again.lead.id).toBe(first.lead.id);
    expect(again.lead).toMatchObject({
      name: 'The Cafe',
      company: 'Cafe Pvt Ltd',
      city: 'Pune',
      pipeline: 'VENUE',
      score: 70,
      tags: ['coffee'],
      emails: ['hi@cafe.in', 'owner@cafe.in'],
      stage: 'NEW',
    });
    expect(again.lead.timeline.map((e) => e.kind)).toEqual(['CREATED', 'SOURCE']);
    expect(again.lead.timeline[1].text).toBe('Seen again from INSTAGRAM');
    expect(await MarketingLeadModel.countDocuments()).toBe(1);
    const stored = await MarketingLeadModel.findById(first.lead.id).lean();
    expect(stored?.email_keys).toEqual(['hi@cafe.in', 'owner@cafe.in']);
  });

  it('never overwrites what is already there, nor the stage a person set', async () => {
    const user = await asha();
    const first = await upsertLead({ name: 'The Cafe', phones: ['9876543210'], city: 'Pune', pipeline: 'HOST', score: 30 }, SYSTEM_LEAD_ACTOR);
    await svc.setStage(first.lead.id, 'CONTACTED', user);
    const again = await upsertLead({ name: 'Other', phones: ['9876543210'], city: 'Mumbai', pipeline: 'VENUE', score: 90 }, SYSTEM_LEAD_ACTOR);
    expect(again.lead).toMatchObject({ name: 'The Cafe', city: 'Pune', pipeline: 'HOST', score: 30, stage: 'CONTACTED' });
  });

  it('takes the oldest when more than one lead matches', async () => {
    const a = await upsertLead({ name: 'A', phones: ['9876543210'] }, SYSTEM_LEAD_ACTOR);
    await upsertLead({ name: 'B', emails: ['b@cafe.in'] }, SYSTEM_LEAD_ACTOR);
    const bridge = await upsertLead({ name: 'C', phones: ['9876543210'], emails: ['b@cafe.in'] }, SYSTEM_LEAD_ACTOR);
    expect(bridge.lead.id).toBe(a.lead.id);
  });
});

describe('create, update and the table', () => {
  it('creates by hand as MANUAL under the person, and says when it merged', async () => {
    const user = await asha();
    const made = await svc.create({ name: 'Rani Events', phones: ['9123456789'] }, user);
    expect(made.merged).toBe(false);
    expect(made.lead).toMatchObject({ source: 'MANUAL', created_by: user.id });
    expect(made.lead.timeline[0].by_name).toBe('Asha Staff');
    const dup = await svc.create({ name: 'Rani Events', phones: ['+91 91234 56789'], source: 'WEB_SEARCH' }, user);
    expect(dup.merged).toBe(true);
    expect(dup.lead.id).toBe(made.lead.id);
  });

  it('edits a lead, refuses keys another lead holds, and knows an unknown id', async () => {
    const user = await asha();
    const a = (await svc.create({ name: 'A', phones: ['9123456789'] }, user)).lead;
    const b = (await svc.create({ name: 'B', emails: ['b@cafe.in'] }, user)).lead;
    const edited = await svc.update(b.id, { name: 'B2', city: 'Pune', emails: ['b@cafe.in'], website: 'b.in' });
    expect(edited).toMatchObject({ name: 'B2', city: 'Pune', website: 'b.in', source: 'MANUAL' });
    await expect(svc.update(b.id, { name: 'B2', phones: ['9123456789'] })).rejects.toThrow('Another lead already has');
    expect((await svc.get(a.id)).phones).toEqual(['9123456789']);
    await expect(svc.get('000000000000000000000000')).rejects.toThrow('Lead not found');
    await expect(svc.get('nope')).rejects.toThrow('Lead not found');
  });

  it('pages, filters and searches the leads, naming each owner once per page', async () => {
    const user = await asha();
    const owner = await makeUser('Ravi');
    const venue = (await svc.create({ name: 'Blue Cafe', pipeline: 'VENUE', city: 'Pune', score: 80, phones: ['9123456789'] }, user)).lead;
    await svc.create({ name: 'Rani Events', pipeline: 'HOST', city: 'Mumbai', emails: ['rani@events.in'] }, user);
    await svc.create({ name: 'Zed Brand', pipeline: 'BRAND', website: 'zed.in' }, user);
    await svc.assignOwner(venue.id, String(owner._id), user);
    await svc.setStage(venue.id, 'CONTACTED', user);

    const all = await svc.table({ sort_by: 'name', sort_dir: 'asc' });
    expect(all.total).toBe(3);
    expect(all.rows.map((r) => r.name)).toEqual(['Blue Cafe', 'Rani Events', 'Zed Brand']);
    expect(all.rows[0]).toMatchObject({ owner_user_id: String(owner._id), owner_name: 'Ravi Staff' });
    // The page leaves the history out; the drawer reads it per lead.
    expect(all.rows[0].timeline).toEqual([]);
    expect(all.rows[0].notes).toEqual([]);
    expect((await svc.get(venue.id)).timeline.length).toBeGreaterThan(1);

    const pinned = await svc.table({ filters: [{ field: 'pipeline', op: 'eq', value: 'VENUE' }] });
    expect(pinned.rows.map((r) => r.name)).toEqual(['Blue Cafe']);
    const staged = await svc.table({ filters: [{ field: 'stage', op: 'in', values: ['CONTACTED', 'REPLIED'] }] });
    expect(staged.rows.map((r) => r.name)).toEqual(['Blue Cafe']);
    const scored = await svc.table({ filters: [{ field: 'score', op: 'gte', value: '50' }] });
    expect(scored.rows.map((r) => r.name)).toEqual(['Blue Cafe']);
    const unpromoted = await svc.table({ filters: [{ field: 'has_crm_ref', op: 'is_false' }] });
    expect(unpromoted.total).toBe(3);
    const byPhone = await svc.table({ search: '912345' });
    expect(byPhone.rows.map((r) => r.name)).toEqual(['Blue Cafe']);
    const byHost = await svc.table({ search: 'zed.in' });
    expect(byHost.rows.map((r) => r.name)).toEqual(['Zed Brand']);
    const byCity = await svc.table({ filters: [{ field: 'city', op: 'eq', value: 'Mumbai' }] });
    expect(byCity.rows.map((r) => r.name)).toEqual(['Rani Events']);
  });
});

describe('stage, owner and notes', () => {
  it('moves the stage with a timeline entry, keeps the note given, and needs one to lose a lead', async () => {
    const user = await asha();
    const lead = (await svc.create({ name: 'Blue Cafe' }, user)).lead;
    const contacted = await svc.setStage(lead.id, 'CONTACTED', user);
    expect(contacted.stage).toBe('CONTACTED');
    expect(contacted.timeline.at(-1)).toMatchObject({ kind: 'STAGE', text: 'NEW → CONTACTED', by_name: 'Asha Staff' });
    expect(contacted.notes).toEqual([]);

    await expect(svc.setStage(lead.id, 'CONTACTED', user)).rejects.toThrow('already CONTACTED');
    await expect(svc.setStage(lead.id, 'LOST', user, '  ')).rejects.toThrow('a note is required');
    await expect(svc.setStage(lead.id, 'LOST', user, 'x'.repeat(2001))).rejects.toThrow('under 2000');
    await expect(svc.setStage(lead.id, 'GONE' as never, user)).rejects.toThrow('stage does not exist');

    const lost = await svc.setStage(lead.id, 'LOST', user, 'Went with a competitor');
    expect(lost.stage).toBe('LOST');
    expect(lost.timeline.at(-1)).toMatchObject({ kind: 'STAGE', text: 'CONTACTED → LOST: Went with a competitor' });
    expect(lost.notes).toEqual([expect.objectContaining({ by_user_id: user.id, by_name: 'Asha Staff', text: 'Went with a competitor' })]);
  });

  it('assigns a living user as owner, clears it, and refuses a stranger or a deleted user', async () => {
    const user = await asha();
    const owner = await makeUser('Ravi');
    const gone = await makeUser('Gone', { metadata: { status: 'ACTIVE', role_keys: [], deleted_at: new Date() } });
    const lead = (await svc.create({ name: 'Blue Cafe' }, user)).lead;

    const owned = await svc.assignOwner(lead.id, String(owner._id), user);
    expect(owned).toMatchObject({ owner_user_id: String(owner._id), owner_name: 'Ravi Staff' });
    expect(owned.timeline.at(-1)).toMatchObject({ kind: 'OWNER', text: 'Assigned to Ravi Staff' });

    await expect(svc.assignOwner(lead.id, 'not-an-id', user)).rejects.toThrow('not a known user');
    await expect(svc.assignOwner(lead.id, String(gone._id), user)).rejects.toThrow('not a known user');

    const cleared = await svc.assignOwner(lead.id, null, user);
    expect(cleared.owner_user_id).toBeNull();
    expect(cleared.timeline.at(-1)).toMatchObject({ kind: 'OWNER', text: 'Owner cleared' });
    await expect(svc.assignOwner('000000000000000000000000', null, user)).rejects.toThrow('Lead not found');
  });

  it('keeps notes with who wrote them, and refuses an empty or endless one', async () => {
    const user = await asha();
    const lead = (await svc.create({ name: 'Blue Cafe' }, user)).lead;
    const noted = await svc.addNote(lead.id, '  Spoke to the owner, call back Monday  ', user);
    expect(noted.notes).toEqual([expect.objectContaining({ by_user_id: user.id, by_name: 'Asha Staff', text: 'Spoke to the owner, call back Monday' })]);
    expect(noted.notes[0].at).toEqual(expect.any(String));
    expect(noted.timeline.at(-1)).toMatchObject({ kind: 'NOTE', text: 'Spoke to the owner, call back Monday' });
    await expect(svc.addNote(lead.id, '   ', user)).rejects.toThrow('Write the note first');
    await expect(svc.addNote(lead.id, 'x'.repeat(2001), user)).rejects.toThrow('under 2000');
  });

  it('counts the leads at each stage and in each pipeline', async () => {
    const user = await asha();
    const a = (await svc.create({ name: 'A', pipeline: 'VENUE' }, user)).lead;
    await svc.create({ name: 'B', pipeline: 'VENUE' }, user);
    await svc.create({ name: 'C', pipeline: 'HOST' }, user);
    await svc.setStage(a.id, 'QUALIFIED', user);
    const summary = await svc.summary();
    expect(summary.total).toBe(3);
    expect(summary.stages).toEqual([
      { stage: 'NEW', count: 2 },
      { stage: 'CONTACTED', count: 0 },
      { stage: 'REPLIED', count: 0 },
      { stage: 'QUALIFIED', count: 1 },
      { stage: 'CONVERTED', count: 0 },
      { stage: 'LOST', count: 0 },
    ]);
    expect(summary.pipelines.filter((p) => p.count > 0)).toEqual([
      { pipeline: 'VENUE', count: 2 },
      { pipeline: 'HOST', count: 1 },
    ]);
  });
});
