/**
 * The lead resolvers' gate: the marketing console works its leads, an editor
 * included, but handing one to the CRM is a manager's call. The services are
 * faked; only the gate and what it hands them are under test.
 */
jest.mock('../../marketingLead.service', () => ({
  marketingLeadService: {
    table: jest.fn(),
    get: jest.fn(),
    summary: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setStage: jest.fn(),
    assignOwner: jest.fn(),
    addNote: jest.fn(),
  },
}));
jest.mock('../../marketingLead.import', () => ({ importLeads: jest.fn() }));
jest.mock('../../marketingLead.promote', () => ({ promoteToCrm: jest.fn() }));

import { makeContext } from '@test/harness';
import { marketingLeadService } from '../../marketingLead.service';
import { importLeads } from '../../marketingLead.import';
import { promoteToCrm } from '../../marketingLead.promote';
import { marketingLeadResolvers } from '../../marketingLead.resolver';

const svc = marketingLeadService as unknown as Record<string, jest.Mock>;
const importMock = importLeads as jest.Mock;
const promoteMock = promoteToCrm as jest.Mock;
const Q = marketingLeadResolvers.Query;
const M = marketingLeadResolvers.Mutation;
const editor = () => makeContext({ roles: ['MARKETING_EDITOR'] });
const manager = () => makeContext({ roles: ['MARKETING_MANAGER'] });
const input = { name: 'Blue Cafe', phones: ['9876543210'] };

beforeEach(() => {
  for (const fn of Object.values(svc)) fn.mockReset().mockResolvedValue({ id: 'l1' });
  importMock.mockReset().mockResolvedValue({ added: 1 });
  promoteMock.mockReset().mockResolvedValue({ id: 'l1' });
});

describe('the lead gate', () => {
  it('lets an editor read, add, edit, move, assign, note and import leads, as themselves', async () => {
    const ctx = editor();
    await Q.marketingLeadsTable({}, { query: { page: 2 } }, ctx);
    await Q.marketingLead({}, { id: 'l1' }, ctx);
    await Q.marketingLeadSummary({}, {}, ctx);
    await M.createMarketingLead({}, { input }, ctx);
    await M.updateMarketingLead({}, { id: 'l1', input }, ctx);
    await M.setMarketingLeadStage({}, { id: 'l1', stage: 'LOST', note: 'Went elsewhere' }, ctx);
    await M.assignMarketingLeadOwner({}, { id: 'l1', owner_user_id: 'u9' }, ctx);
    await M.addMarketingLeadNote({}, { id: 'l1', text: 'Called' }, ctx);
    await M.importMarketingLeads({}, { rows: [['Cafe']], mapping: { name: 0 } }, ctx);

    expect(svc.table).toHaveBeenCalledWith({ page: 2 });
    expect(svc.get).toHaveBeenCalledWith('l1');
    expect(svc.summary).toHaveBeenCalledTimes(1);
    expect(svc.create).toHaveBeenCalledWith(input, ctx.user);
    expect(svc.update).toHaveBeenCalledWith('l1', input);
    expect(svc.setStage).toHaveBeenCalledWith('l1', 'LOST', ctx.user, 'Went elsewhere');
    expect(svc.assignOwner).toHaveBeenCalledWith('l1', 'u9', ctx.user);
    expect(svc.addNote).toHaveBeenCalledWith('l1', 'Called', ctx.user);
    expect(importMock).toHaveBeenCalledWith([['Cafe']], { name: 0 }, ctx.user);
  });

  it('keeps promotion for managers', async () => {
    expect(() => M.promoteMarketingLeadToCrm({}, { id: 'l1', kind: 'VENUE' }, editor())).toThrow(/access denied/i);
    expect(promoteMock).not.toHaveBeenCalled();
    const boss = manager();
    await M.promoteMarketingLeadToCrm({}, { id: 'l1', kind: 'VENUE' }, boss);
    expect(promoteMock).toHaveBeenCalledWith('l1', 'VENUE', boss.user);
    await M.promoteMarketingLeadToCrm({}, { id: 'l1', kind: 'HOST' }, makeContext({ roles: ['SUPER_ADMIN'] }));
    expect(promoteMock).toHaveBeenCalledTimes(2);
  });

  it('keeps everyone else out', () => {
    const ctx = makeContext({ roles: ['USER'] });
    expect(() => Q.marketingLeadsTable({}, {}, ctx)).toThrow(/access denied/i);
    expect(() => Q.marketingLeadSummary({}, {}, ctx)).toThrow(/access denied/i);
    expect(() => M.createMarketingLead({}, { input }, ctx)).toThrow(/access denied/i);
    expect(() => M.importMarketingLeads({}, { rows: [], mapping: { name: 0 } }, ctx)).toThrow(/access denied/i);
    expect(() => M.promoteMarketingLeadToCrm({}, { id: 'l1', kind: 'VENUE' }, ctx)).toThrow(/access denied/i);
    expect(() => Q.marketingLead({}, { id: 'l1' }, makeContext(null))).toThrow();
    expect(svc.table).not.toHaveBeenCalled();
    expect(svc.create).not.toHaveBeenCalled();
  });
});
