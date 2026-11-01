/**
 * The outreach gate: the marketing console reads sequences and may save one
 * that is not live, draft with AI and close DM tasks; switching on, enrolling
 * and managing enrollments is a manager's call. The services are faked.
 */
jest.mock('../../outreach.service', () => ({
  outreachService: {
    list: jest.fn(),
    get: jest.fn(),
    enrollmentsTable: jest.fn(),
    tasks: jest.fn(),
    enrollCount: jest.fn(),
    save: jest.fn(),
    setActive: jest.fn(),
    enroll: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    remove: jest.fn(),
    completeTask: jest.fn(),
  },
}));
jest.mock('../../outreach.templates', () => ({ outreachWaTemplates: jest.fn() }));
jest.mock('../../outreach.draft', () => ({ draftSequenceStep: jest.fn() }));
jest.mock('../../../leads/marketingLead.service', () => ({ leadActor: jest.fn().mockResolvedValue({ id: 'u1', name: 'Asha Rao' }) }));

import { makeContext } from '@test/harness';
import { outreachService } from '../../outreach.service';
import { outreachWaTemplates } from '../../outreach.templates';
import { draftSequenceStep } from '../../outreach.draft';
import { outreachResolvers } from '../../outreach.resolver';

const svc = outreachService as unknown as Record<string, jest.Mock>;
const Q = outreachResolvers.Query;
const M = outreachResolvers.Mutation;
const editor = () => makeContext({ roles: ['MARKETING_EDITOR'] });
const manager = () => makeContext({ roles: ['MARKETING_MANAGER'] });
const input = { name: 'S', steps: [{ kind: 'EMAIL' as const, subject: 's', body: 'b' }], daily_limit: 5 };

beforeEach(() => {
  for (const fn of Object.values(svc)) fn.mockReset().mockResolvedValue({ id: 'x' });
  (outreachWaTemplates as jest.Mock).mockReset().mockResolvedValue([]);
  (draftSequenceStep as jest.Mock).mockReset().mockResolvedValue({ subject: '', body: 'b' });
});

describe('the outreach gate', () => {
  it('lets an editor read, save as a non-manager, draft and close a task', async () => {
    const ctx = editor();
    await Q.outreachSequences({}, {}, ctx);
    await Q.outreachSequence({}, { id: 's1' }, ctx);
    await Q.outreachEnrollmentsTable({}, { query: { page: 2 } }, ctx);
    await Q.outreachTasks({}, {}, ctx);
    await Q.outreachWaTemplates({}, {}, ctx);
    await M.saveOutreachSequence({}, { id: 's1', input }, ctx);
    await M.draftSequenceStep({}, { sequence_id: 's1', step_index: 0, lead_id: null }, ctx);
    await M.completeOutreachTask({}, { id: 't1', note: 'done' }, ctx);
    expect(svc.get).toHaveBeenCalledWith('s1');
    expect(svc.enrollmentsTable).toHaveBeenCalledWith({ page: 2 });
    expect(svc.save).toHaveBeenCalledWith('s1', input, expect.objectContaining({ roles: ['MARKETING_EDITOR'] }), false);
    expect(draftSequenceStep).toHaveBeenCalledWith('s1', 0, null);
    expect(svc.completeTask).toHaveBeenCalledWith('t1', 'done', { id: expect.any(String), name: 'Asha Rao' });
  });

  it('refuses an editor every manager action', async () => {
    const ctx = editor();
    expect(() => Q.outreachEnrollCount({}, { sequence_id: 's1' }, ctx)).toThrow('Access Denied');
    expect(() => M.setOutreachSequenceActive({}, { id: 's1', active: true }, ctx)).toThrow('Access Denied');
    expect(() => M.enrollLeads({}, { sequence_id: 's1', filter: {} }, ctx)).toThrow('Access Denied');
    expect(() => M.pauseEnrollment({}, { id: 'e1' }, ctx)).toThrow('Access Denied');
    expect(() => M.resumeEnrollment({}, { id: 'e1' }, ctx)).toThrow('Access Denied');
    expect(() => M.removeEnrollment({}, { id: 'e1' }, ctx)).toThrow('Access Denied');
    expect(svc.enroll).not.toHaveBeenCalled();
  });

  it('lets a manager switch on, enroll and manage enrollments', async () => {
    const ctx = manager();
    await M.saveOutreachSequence({}, { input }, ctx);
    await Q.outreachEnrollCount({}, { sequence_id: 's1', filter: { stage: 'NEW' } }, ctx);
    await M.setOutreachSequenceActive({}, { id: 's1', active: true }, ctx);
    await M.enrollLeads({}, { sequence_id: 's1', lead_ids: ['l1'], filter: null }, ctx);
    await M.pauseEnrollment({}, { id: 'e1' }, ctx);
    await M.resumeEnrollment({}, { id: 'e1' }, ctx);
    await M.removeEnrollment({}, { id: 'e1' }, ctx);
    expect(svc.save).toHaveBeenCalledWith(undefined, input, expect.anything(), true);
    expect(svc.enrollCount).toHaveBeenCalledWith('s1', { stage: 'NEW' });
    expect(svc.setActive).toHaveBeenCalledWith('s1', true, expect.anything());
    expect(svc.enroll).toHaveBeenCalledWith('s1', ['l1'], null, expect.anything());
    expect(svc.pause).toHaveBeenCalledWith('e1');
    expect(svc.resume).toHaveBeenCalledWith('e1');
    expect(svc.remove).toHaveBeenCalledWith('e1');
  });

  it('refuses a caller with no marketing role', () => {
    expect(() => Q.outreachSequences({}, {}, makeContext({ roles: ['HOST'] }))).toThrow('Access Denied');
  });
});
