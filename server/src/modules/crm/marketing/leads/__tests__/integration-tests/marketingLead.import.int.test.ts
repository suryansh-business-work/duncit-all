/**
 * A file of rows becomes leads: bad rows are reported by number and skipped,
 * good ones are added or merged through the one upsert, and the whole import
 * is a LEAD_IMPORT run on Activity.
 */
import { UserModel } from '@modules/access/user/user.model';
import { MarketingRunModel } from '../../../runs/marketingRun.model';
import { MarketingLeadModel } from '../../marketingLead.model';
import { marketingLeadService as svc } from '../../marketingLead.service';
import { importLeads, rowInput, rowProblem, type ImportMapping } from '../../marketingLead.import';

const makeUser = () =>
  UserModel.create({
    auth: { email: 'asha@duncit.com' },
    profile: { first_name: 'Asha', last_name: 'Staff' },
    metadata: { status: 'ACTIVE', role_keys: ['MARKETING_MANAGER'] },
  });

const MAPPING: ImportMapping = { name: 0, company: 1, email: 2, phone: 3, website: 4, instagram_handle: 5, city: 6, tags: 7, pipeline: 'VENUE' };

afterEach(async () => {
  await Promise.all([MarketingLeadModel.deleteMany({}), MarketingRunModel.deleteMany({}), UserModel.deleteMany({})]);
});

describe('rowProblem and rowInput', () => {
  it('names what is wrong with a row, in the order a person would fix it', () => {
    expect(rowProblem(['', 'Co'], MAPPING)).toBe('No name');
    expect(rowProblem(['Cafe', '', 'nope'], MAPPING)).toBe('"nope" is not an email address');
    expect(rowProblem(['Cafe', '', 'a@b.in; bad'], MAPPING)).toBe('"bad" is not an email address');
    expect(rowProblem(['Cafe', '', '', '12'], MAPPING)).toBe('"12" is not a phone number');
    expect(rowProblem(['Cafe', '', '', '', 'not a site'], MAPPING)).toBe('"not a site" is not a web address');
    expect(rowProblem(['Cafe', '', '', '', '', 'bad handle!'], MAPPING)).toBe('"bad handle!" is not an Instagram handle');
    expect(rowProblem(['Cafe'], MAPPING)).toBe('');
    // A column the mapping does not name is never read.
    expect(rowProblem(['Cafe', 'x', 'garbage'], { name: 0 })).toBe('');
  });

  it('reads the mapped cells, splitting lists on commas and semicolons', () => {
    expect(rowInput([' Cafe ', 'Co', 'a@b.in, c@d.in', '9876543210;9123456789', 'cafe.in', '@cafe', 'Pune', 'coffee, brunch'], MAPPING, 'run1')).toEqual({
      name: 'Cafe',
      company: 'Co',
      pipeline: 'VENUE',
      source: 'IMPORT',
      emails: ['a@b.in', 'c@d.in'],
      phones: ['9876543210', '9123456789'],
      website: 'cafe.in',
      instagram_handle: '@cafe',
      city: 'Pune',
      tags: ['coffee', 'brunch'],
      source_ref: { import_id: 'run1' },
    });
    expect(rowInput(['Cafe'], { name: 0 }, 'run1')).toMatchObject({ pipeline: 'GENERAL', emails: [], phones: [], tags: [] });
  });
});

describe('importLeads', () => {
  it('adds the good rows, merges the known ones, skips and explains the bad ones, and records a run', async () => {
    const user = { id: String((await makeUser())._id) };
    await svc.create({ name: 'Blue Cafe', phones: ['9876543210'] }, user);
    const rows = [
      ['Blue Cafe', 'Blue Cafe Pvt', 'hello@bluecafe.in', '+91 98765 43210', 'bluecafe.in', '', 'Pune', 'coffee'],
      ['Rani Events', '', 'rani@events.in', '9123456789', '', '@rani.events', 'Mumbai', ''],
      ['', '', '', '', '', '', '', ''],
      ['Bad Phone', '', '', '12', '', '', '', ''],
      ['Zed Brand', '', 'not-an-email', '', '', '', '', ''],
    ];
    const result = await importLeads(rows, MAPPING, user);
    expect(result).toMatchObject({ added: 1, merged: 1, skipped: 3 });
    expect(result.rows).toEqual([
      { row: 1, outcome: 'MERGED', reason: '', lead_id: expect.any(String) },
      { row: 2, outcome: 'ADDED', reason: '', lead_id: expect.any(String) },
      { row: 3, outcome: 'SKIPPED', reason: 'No name', lead_id: '' },
      { row: 4, outcome: 'SKIPPED', reason: '"12" is not a phone number', lead_id: '' },
      { row: 5, outcome: 'SKIPPED', reason: '"not-an-email" is not an email address', lead_id: '' },
    ]);
    expect(await MarketingLeadModel.countDocuments()).toBe(2);

    const blue = await svc.get(result.rows[0].lead_id);
    expect(blue).toMatchObject({ company: 'Blue Cafe Pvt', emails: ['hello@bluecafe.in'], city: 'Pune', pipeline: 'VENUE', tags: ['coffee'] });
    expect(blue.source).toBe('MANUAL');
    expect(blue.source_ref.import_id).toBe(result.run_id);
    expect(blue.timeline.at(-1)).toMatchObject({ kind: 'SOURCE', text: 'Seen again from IMPORT', by_name: 'Asha Staff' });

    const rani = await svc.get(result.rows[1].lead_id);
    expect(rani).toMatchObject({ source: 'IMPORT', pipeline: 'VENUE', instagram_handle: 'rani.events', city: 'Mumbai' });
    expect(rani.timeline).toEqual([expect.objectContaining({ kind: 'IMPORTED', text: 'Added from IMPORT' })]);

    const run = await MarketingRunModel.findById(result.run_id).lean();
    expect(run).toMatchObject({
      workflow: 'LEAD_IMPORT',
      name: 'Import 5 leads from a file',
      status: 'COMPLETED',
      trigger: 'USER',
      actor: { kind: 'USER', id: user.id, name: 'Asha Staff' },
    });
    expect(run?.steps.map((s) => [s.key, s.status, s.input_summary, s.output_summary])).toEqual([
      ['validate', 'OK', '5 rows', '2 usable, 3 skipped'],
      ['save', 'OK', '', '1 added, 1 merged'],
    ]);
  });

  it('refuses an empty file, too many rows, a missing name column or an unknown pipeline before starting a run', async () => {
    const user = { id: String((await makeUser())._id) };
    await expect(importLeads([], MAPPING, user)).rejects.toThrow('no rows');
    await expect(importLeads(Array.from({ length: 2001 }, () => ['x']), MAPPING, user)).rejects.toThrow('at most 2000');
    await expect(importLeads([['x']], { name: -1 }, user)).rejects.toThrow('which column holds the name');
    await expect(importLeads([['x']], { name: 0, pipeline: 'NOPE' as never }, user)).rejects.toThrow('pipeline does not exist');
    expect(await MarketingRunModel.countDocuments()).toBe(0);
  });
});
